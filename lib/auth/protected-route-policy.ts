export function isPublicProtectedRoute(pathname: string): boolean {
  return pathname === '/admin/login'
}

export function loginPathForProtectedRoute(pathname: string): '/admin/login' | '/login' {
  return pathname === '/admin' || pathname.startsWith('/admin/') ? '/admin/login' : '/login'
}
