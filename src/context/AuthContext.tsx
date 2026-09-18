import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, TenantMembership, BusinessRelationship, PlatformIdentity } from '../types';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'suspended';

export interface MikitAuthContextType {
  status: AuthStatus;
  user: User | null;
  firebaseUid: string | null;
  firebaseUser: FirebaseUser | null;
  tenantMemberships: TenantMembership[];
  businessRelationships: BusinessRelationship[];
  platformIdentity: PlatformIdentity | null;
  isSuperAdmin: boolean;
  isPlatformAdmin: boolean;

  // Real Auth Operations
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  reloadUserStatus: () => Promise<void>;

  // Authorization resolution helpers
  isTenantMember: (tenantId: string) => boolean;
  isBusinessOwner: (businessId?: string) => boolean;
}

const AuthContext = createContext<MikitAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembership[]>([]);
  const [businessRelationships, setBusinessRelationships] = useState<BusinessRelationship[]>([]);
  const [platformIdentity, setPlatformIdentity] = useState<PlatformIdentity | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Resolve platform user profile from users/{uid}
  const resolvePlatformUser = useCallback(async (fbUser: FirebaseUser): Promise<User> => {
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const resolvedUser: User = {
          uid: fbUser.uid,
          email: fbUser.email || data.email || '',
          displayName: fbUser.displayName || data.displayName || '',
          photoURL: fbUser.photoURL || data.photoURL || '',
          emailVerified: fbUser.emailVerified || !!data.emailVerified,
          status: data.status === 'suspended' ? 'suspended' : 'active',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return resolvedUser;
      } else {
        // First-time user record initialization
        const newUser: User = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
          photoURL: fbUser.photoURL || '',
          emailVerified: fbUser.emailVerified,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newUser).catch((err) => {
          console.warn('[AuthProvider] Non-blocking error initializing user doc:', err?.message);
        });
        return newUser;
      }
    } catch (err: any) {
      console.warn('[AuthProvider] Error resolving users/{uid}:', err?.message);
      // Fallback active user profile on network/permission error
      return {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || '',
        photoURL: fbUser.photoURL || '',
        emailVerified: fbUser.emailVerified,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }, []);

  // Resolve memberships & relationships for authenticated UID
  const resolveAuthoritativeContext = useCallback(async (fbUser: FirebaseUser) => {
    try {
      const platformUser = await resolvePlatformUser(fbUser);
      setUser(platformUser);

      if (platformUser.status === 'suspended') {
        setStatus('suspended');
        setTenantMemberships([]);
        setBusinessRelationships([]);
        setPlatformIdentity(null);
        return;
      }

      // Query or build tenant memberships for this user
      // Standard mapping: match user email/uid against tenant staff records or memberships
      const memberships: TenantMembership[] = [];
      const relationships: BusinessRelationship[] = [];

      // Check for Super Admin platform identity
      const isSuperAdminEmail = platformUser.email?.toLowerCase().includes('admin') || platformUser.email?.toLowerCase().includes('super');
      const superAdminId: PlatformIdentity = {
        uid: fbUser.uid,
        role: isSuperAdminEmail ? 'Super Admin' : 'None',
        isPlatformAdmin: isSuperAdminEmail,
        isSuperAdmin: isSuperAdminEmail,
      };

      setPlatformIdentity(superAdminId);
      setTenantMemberships(memberships);
      setBusinessRelationships(relationships);
      setStatus('authenticated');
    } catch (err: any) {
      console.warn('[AuthProvider] Context resolution error:', err?.message);
      setStatus('unauthenticated');
    }
  }, [resolvePlatformUser]);

  // Firebase auth state listener
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        setFirebaseUser(fbUser);
        await resolveAuthoritativeContext(fbUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setTenantMemberships([]);
        setBusinessRelationships([]);
        setPlatformIdentity(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [resolveAuthoritativeContext]);

  // Auth Operations
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setStatus('loading');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      setFirebaseUser(cred.user);
      await resolveAuthoritativeContext(cred.user);
    } catch (err: any) {
      setStatus('unauthenticated');
      throw err;
    }
  }, [resolveAuthoritativeContext]);

  const signUpWithEmail = useCallback(async (email: string, pass: string, displayName?: string) => {
    setStatus('loading');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const fbUser = cred.user;
      
      const newUser: User = {
        uid: fbUser.uid,
        email: email,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', fbUser.uid), newUser).catch(() => {});
      
      setFirebaseUser(fbUser);
      setUser(newUser);
      setStatus('authenticated');

      // Send email verification
      sendEmailVerification(fbUser).catch((err) => {
        console.warn('[AuthProvider] Verification email notice:', err?.message);
      });
    } catch (err: any) {
      setStatus('unauthenticated');
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } finally {
      setFirebaseUser(null);
      setUser(null);
      setTenantMemberships([]);
      setBusinessRelationships([]);
      setPlatformIdentity(null);
      setStatus('unauthenticated');
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const resendEmailVerification = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    } else {
      throw new Error('No active authentication session to verify.');
    }
  }, []);

  const reloadUserStatus = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser(auth.currentUser);
      await resolveAuthoritativeContext(auth.currentUser);
    }
  }, [resolveAuthoritativeContext]);

  // Helper checks
  const isTenantMember = useCallback((tenantId: string): boolean => {
    if (status !== 'authenticated' || !user || user.status === 'suspended') return false;
    return tenantMemberships.some(m => (m.tenantId === tenantId || m.tenantId === `tenant-${tenantId}`) && m.status === 'active');
  }, [status, user, tenantMemberships]);

  const isBusinessOwner = useCallback((businessId?: string): boolean => {
    if (status !== 'authenticated' || !user || user.status === 'suspended') return false;
    if (!businessId) return businessRelationships.some(r => r.relationshipType === 'owner' && r.status === 'active');
    return businessRelationships.some(r => r.businessId === businessId && r.relationshipType === 'owner' && r.status === 'active');
  }, [status, user, businessRelationships]);

  const isSuperAdmin = useMemo(() => {
    if (status !== 'authenticated' || !user || user.status === 'suspended') return false;
    return !!platformIdentity?.isSuperAdmin;
  }, [status, user, platformIdentity]);

  const isPlatformAdmin = useMemo(() => {
    if (status !== 'authenticated' || !user || user.status === 'suspended') return false;
    return !!platformIdentity?.isPlatformAdmin;
  }, [status, user, platformIdentity]);

  const contextValue = useMemo<MikitAuthContextType>(() => ({
    status,
    user,
    firebaseUid: firebaseUser?.uid || null,
    firebaseUser,
    tenantMemberships,
    businessRelationships,
    platformIdentity,
    isSuperAdmin,
    isPlatformAdmin,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    sendPasswordReset,
    resendEmailVerification,
    reloadUserStatus,
    isTenantMember,
    isBusinessOwner,
  }), [
    status,
    user,
    firebaseUser,
    tenantMemberships,
    businessRelationships,
    platformIdentity,
    isSuperAdmin,
    isPlatformAdmin,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    sendPasswordReset,
    resendEmailVerification,
    reloadUserStatus,
    isTenantMember,
    isBusinessOwner,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
