import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  confirmPasswordReset,
  sendEmailVerification,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  confirmPasswordResetCode: (code: string, newPass: string) => Promise<void>;
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

  // Resolve platform user profile from users/{uid} (FAIL CLOSED)
  const resolvePlatformUser = useCallback(async (fbUser: FirebaseUser): Promise<User> => {
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        // Strict fail closed check: Status MUST be explicitly 'active' or 'suspended'
        if (!data || typeof data.status !== 'string' || (data.status !== 'active' && data.status !== 'suspended')) {
          console.error(`[AuthProvider] User ${fbUser.uid} document status is invalid or missing: "${data?.status}"`);
          throw new Error(`Authoritative user status invalid or missing for ${fbUser.uid}: "${data?.status}"`);
        }
        const resolvedUser: User = {
          uid: fbUser.uid,
          email: fbUser.email || data.email || '',
          displayName: fbUser.displayName || data.displayName || '',
          photoURL: fbUser.photoURL || data.photoURL || '',
          emailVerified: fbUser.emailVerified || !!data.emailVerified,
          status: data.status,
          accountRole: data.accountRole || 'CUSTOMER',
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
          accountRole: 'CUSTOMER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newUser);
        return newUser;
      }
    } catch (err: any) {
      console.error('[AuthProvider] Authoritative user resolution failed:', err?.message);
      // FAIL CLOSED: Do NOT return an active user fallback on resolution error
      throw new Error(`Authoritative user resolution failed for ${fbUser.uid}: ${err?.message}`);
    }
  }, []);

  // Resolve platform identity authoritatively from platform_users/{uid} or users/{uid} fields (NO SWALLOWING ERRORS)
  const resolvePlatformIdentity = useCallback(async (fbUser: FirebaseUser): Promise<PlatformIdentity> => {
    // 1. Check platform_users/{uid}
    const platformDocRef = doc(db, 'platform_users', fbUser.uid);
    let platformSnap;
    try {
      platformSnap = await getDoc(platformDocRef);
    } catch (err: any) {
      console.error('[AuthProvider] Failed to fetch platform_users/{uid}:', err?.message);
      throw new Error(`Platform identity query failed for ${fbUser.uid}: ${err?.message}`);
    }

    if (platformSnap && platformSnap.exists()) {
      const pData = platformSnap.data();
      return {
        uid: fbUser.uid,
        role: pData.role || (pData.isSuperAdmin ? 'Super Admin' : 'Platform Operator'),
        isPlatformAdmin: !!pData.isPlatformAdmin || !!pData.isSuperAdmin,
        isSuperAdmin: !!pData.isSuperAdmin,
      };
    }

    // 2. Check users/{uid} for explicit platform admin fields
    const userDocRef = doc(db, 'users', fbUser.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userDocRef);
    } catch (err: any) {
      console.error('[AuthProvider] Failed to fetch users/{uid} for platform identity:', err?.message);
      throw new Error(`User platform identity query failed for ${fbUser.uid}: ${err?.message}`);
    }

    if (userSnap && userSnap.exists()) {
      const uData = userSnap.data();
      if (uData.isSuperAdmin === true || uData.role === 'Super Admin') {
        return {
          uid: fbUser.uid,
          role: 'Super Admin',
          isPlatformAdmin: true,
          isSuperAdmin: true,
        };
      }
      if (uData.isPlatformAdmin === true || uData.role === 'Platform Admin' || uData.role === 'Platform Operator') {
        return {
          uid: fbUser.uid,
          role: 'Platform Operator',
          isPlatformAdmin: true,
          isSuperAdmin: false,
        };
      }
    }

    return {
      uid: fbUser.uid,
      role: 'None',
      isPlatformAdmin: false,
      isSuperAdmin: false,
    };
  }, []);

  // Resolve memberships & relationships for authenticated UID
  const resolveAuthoritativeContext = useCallback(async (fbUser: FirebaseUser): Promise<boolean> => {
    try {
      const platformUser = await resolvePlatformUser(fbUser);
      setUser(platformUser);

      if (platformUser.status === 'suspended') {
        setStatus('suspended');
        setTenantMemberships([]);
        setBusinessRelationships([]);
        setPlatformIdentity(null);
        return true;
      }

      // Query tenant_memberships (FAIL CLOSED on Firestore error)
      const memberships: TenantMembership[] = [];
      try {
        const tmQuery = query(collection(db, 'tenant_memberships'), where('uid', '==', fbUser.uid));
        const tmSnap = await getDocs(tmQuery);
        tmSnap.forEach((docSnap) => {
          memberships.push(docSnap.data() as TenantMembership);
        });
      } catch (e: any) {
        console.error('[AuthProvider] Failed to query tenant_memberships collection:', e?.message);
        throw new Error(`tenant_memberships query failed: ${e?.message}`);
      }

      try {
        const subTmSnap = await getDocs(collection(db, 'users', fbUser.uid, 'tenant_memberships'));
        subTmSnap.forEach((docSnap) => {
          const m = docSnap.data() as TenantMembership;
          if (!memberships.some(existing => existing.tenantId === m.tenantId)) {
            memberships.push(m);
          }
        });
      } catch (e: any) {
        console.error('[AuthProvider] Failed to query user tenant_memberships subcollection:', e?.message);
        throw new Error(`user tenant_memberships query failed: ${e?.message}`);
      }

      // Query business_relationships (FAIL CLOSED on Firestore error)
      const relationships: BusinessRelationship[] = [];
      try {
        const brQuery = query(collection(db, 'business_relationships'), where('uid', '==', fbUser.uid));
        const brSnap = await getDocs(brQuery);
        brSnap.forEach((docSnap) => {
          relationships.push(docSnap.data() as BusinessRelationship);
        });
      } catch (e: any) {
        console.error('[AuthProvider] Failed to query business_relationships collection:', e?.message);
        throw new Error(`business_relationships query failed: ${e?.message}`);
      }

      try {
        const subBrSnap = await getDocs(collection(db, 'users', fbUser.uid, 'business_relationships'));
        subBrSnap.forEach((docSnap) => {
          const r = docSnap.data() as BusinessRelationship;
          if (!relationships.some(existing => existing.businessId === r.businessId)) {
            relationships.push(r);
          }
        });
      } catch (e: any) {
        console.error('[AuthProvider] Failed to query user business_relationships subcollection:', e?.message);
        throw new Error(`user business_relationships query failed: ${e?.message}`);
      }

      // Resolve platform identity authoritatively (FAIL CLOSED on Firestore error)
      const resolvedPlatformIdentity = await resolvePlatformIdentity(fbUser);

      setPlatformIdentity(resolvedPlatformIdentity);
      setTenantMemberships(memberships);
      setBusinessRelationships(relationships);
      setStatus('authenticated');
      return true;
    } catch (err: any) {
      console.error('[AuthProvider] Fail closed on context resolution error:', err?.message);
      setUser(null);
      setTenantMemberships([]);
      setBusinessRelationships([]);
      setPlatformIdentity(null);
      setStatus('suspended'); // Fail closed on resolution failure!
      return false;
    }
  }, [resolvePlatformUser, resolvePlatformIdentity]);

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
      const resolved = await resolveAuthoritativeContext(cred.user);
      if (!resolved) {
        await firebaseSignOut(auth);
        setFirebaseUser(null);
        throw new Error('Authentication succeeded, but authoritative MikitHub identity could not be resolved. Access denied.');
      }
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

      // The Firebase account is not considered a MikitHub-authenticated session
      // until the authoritative platform user document has been persisted and
      // the complete authorization context has been resolved successfully.
      await setDoc(doc(db, 'users', fbUser.uid), newUser);

      setFirebaseUser(fbUser);
      const resolved = await resolveAuthoritativeContext(fbUser);
      if (!resolved) {
        await firebaseSignOut(auth);
        setFirebaseUser(null);
        throw new Error('Registration succeeded in Firebase, but authoritative MikitHub identity could not be resolved. Access denied.');
      }

      sendEmailVerification(fbUser).catch((err) => {
        console.warn('[AuthProvider] Verification email notice:', err?.message);
      });
    } catch (err: any) {
      setStatus('unauthenticated');
      throw err;
    }
  }, [resolveAuthoritativeContext]);

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

  const confirmPasswordResetCode = useCallback(async (code: string, newPass: string) => {
    await confirmPasswordReset(auth, code, newPass);
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
    if (status !== 'authenticated' || !user || user.status !== 'active') return false;
    return tenantMemberships.some(m => 
      (m.tenantId === tenantId || m.tenantId === `tenant-${tenantId}` || tenantId.includes(m.tenantId)) && 
      m.status === 'active'
    );
  }, [status, user, tenantMemberships]);

  const isBusinessOwner = useCallback((businessId?: string): boolean => {
    if (status !== 'authenticated' || !user || user.status !== 'active') return false;
    if (!businessId) {
      return businessRelationships.some(r => r.relationshipType === 'owner' && r.status === 'active');
    }
    return businessRelationships.some(r => 
      r.businessId === businessId && r.relationshipType === 'owner' && r.status === 'active'
    );
  }, [status, user, businessRelationships]);

  const isSuperAdmin = useMemo(() => {
    if (status !== 'authenticated' || !user || user.status !== 'active') return false;
    return !!platformIdentity?.isSuperAdmin;
  }, [status, user, platformIdentity]);

  const isPlatformAdmin = useMemo(() => {
    if (status !== 'authenticated' || !user || user.status !== 'active') return false;
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
    confirmPasswordResetCode,
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
    confirmPasswordResetCode,
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

