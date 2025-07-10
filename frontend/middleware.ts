import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Публичные маршруты, которые не требуют аутентификации
  const publicRoutes = ['/login'];
  
  // Проверяем, является ли текущий маршрут публичным
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Получаем токен из cookies
  const token = request.cookies.get('access')?.value;
  
  // Если пользователь не авторизован и пытается получить доступ к защищенному маршруту
  if (!token && !isPublicRoute) {
    // Перенаправляем на страницу логина
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Если пользователь авторизован и пытается получить доступ к странице логина
  if (token && isPublicRoute) {
    // Перенаправляем на главную страницу
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 