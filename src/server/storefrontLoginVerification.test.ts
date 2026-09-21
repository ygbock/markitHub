import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const navFile = fs.readFileSync(path.resolve('src/components/ecommerce/ECommerceNav.tsx'), 'utf-8');
const storefrontFile = fs.readFileSync(path.resolve('src/components/ECommerceStorefront.tsx'), 'utf-8');
const loginPageFile = fs.readFileSync(path.resolve('src/components/LoginPage.tsx'), 'utf-8');
const appFile = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

test('Storefront Navigation 1: ECommerceNav includes dedicated Login button with id ecom-btn-login', () => {
  assert.ok(navFile.includes('id="ecom-btn-login"'), 'ecom-btn-login must exist on desktop');
  assert.ok(navFile.includes('id="ecom-btn-login-mobile"'), 'ecom-btn-login-mobile must exist on mobile');
  assert.ok(navFile.includes('<span>Login</span>'), 'Desktop button label must say Login');
  assert.ok(navFile.includes('<span>Sign In / Login</span>'), 'Mobile button label must say Sign In / Login');
  assert.ok(navFile.includes('LogIn'), 'Must use LogIn icon');
});

test('Storefront Navigation 2: ECommerceNav does not contain direct admin bypass button', () => {
  assert.ok(!navFile.includes('Open Staff Admin Console'), 'Direct admin console bypass button must be removed from nav');
  assert.ok(!navFile.includes('Admin Terminal</span>'), 'Storefront nav must not have an Admin Terminal label');
});

test('Storefront Navigation 3: ECommerceNavProps defines onOpenLogin and wires it to onClick', () => {
  assert.ok(navFile.includes('onOpenLogin?: () => void;'), 'ECommerceNavProps must include onOpenLogin');
  assert.ok(navFile.includes('onClick={() => (onOpenLogin ? onOpenLogin() : onSwitchToAdmin?.())}'), 'onClick must trigger onOpenLogin');
});

test('Storefront Integration 4: ECommerceStorefront accepts onOpenLogin and forwards to ECommerceNav', () => {
  assert.ok(storefrontFile.includes('onOpenLogin?: () => void;'), 'ECommerceStorefrontProps must include onOpenLogin');
  assert.ok(storefrontFile.includes('onOpenLogin={onOpenLogin}'), 'ECommerceStorefront must pass onOpenLogin to ECommerceNav');
});

test('Login Page 5: LoginPage provides dual mode authentication for Staff and Customers', () => {
  assert.ok(loginPageFile.includes('const defaultLoginMode'), 'Must derive the initial login mode from the destination');
  assert.ok(loginPageFile.includes("returnUrl?.startsWith('/tenant/') || returnUrl?.startsWith('/superadmin/')"), 'Operational destinations must select staff mode');
  assert.ok(loginPageFile.includes("setLoginMode(defaultLoginMode)"), 'Login mode must update when the return destination changes');
  assert.ok(loginPageFile.includes('id="tab-login-staff"'), 'Staff tab must exist');
  assert.ok(loginPageFile.includes('id="tab-login-customer"'), 'Customer tab must exist');
});

test('Login Page 6: LoginPage enforces PIN authentication and blocks suspended staff', () => {
  assert.ok(loginPageFile.includes("selectedStaff.status?.toLowerCase() === 'suspended'"), 'Must check for suspended staff');
  assert.ok(loginPageFile.includes('selectedStaff.pin !== staffPin.trim()'), 'Must validate PIN against selected staff');
  assert.ok(loginPageFile.includes('onStaffLogin(selectedStaff)'), 'Must call onStaffLogin on successful authentication');
});

test('Login Page 7: LoginPage provides Return to Storefront navigation button', () => {
  assert.ok(loginPageFile.includes('id="btn-back-to-storefront"'), 'Back to Storefront button must exist');
  assert.ok(loginPageFile.includes('onClick={onBackToStore}'), 'Must wire onBackToStore callback');
});

test('App Routing 8: App.tsx handles /login route and switches between Login, Admin, and ECommerce views via Canonical Router', () => {
  assert.ok(appFile.includes("activeDomain === 'IDENTITY_AUTH'"), 'Must dispatch on IDENTITY_AUTH canonical domain');
  assert.ok(appFile.includes("import LoginPage from './components/LoginPage';"), 'Must import LoginPage component');
  assert.ok(appFile.includes("<LoginPage"), 'Must render LoginPage when activeDomain is IDENTITY_AUTH');
  assert.ok(appFile.includes("navigate(`/login?returnUrl="), 'Must navigate to /login for authentication flow');
  assert.ok(appFile.includes("onOpenLogin={() => navigate("), 'Must pass login navigation handler to storefront');
});
