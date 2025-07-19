from django.utils import timezone
from django.http import JsonResponse
from django.conf import settings
from .models import User
import logging
import traceback

logger = logging.getLogger(__name__)

class UserActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Обновляем last_seen для аутентифицированного пользователя
        if request.user.is_authenticated and hasattr(request.user, 'last_seen'):
            request.user.last_seen = timezone.now()
            request.user.save(update_fields=['last_seen'])
        
        response = self.get_response(request)
        return response

class ErrorHandlingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            logger.error(f"Unhandled exception in {request.path}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Возвращаем JSON ошибку для API запросов
            if request.path.startswith('/api/'):
                return JsonResponse({
                    'error': 'Internal server error',
                    'detail': str(e) if settings.DEBUG else 'Something went wrong'
                }, status=500)
            
            # Для обычных запросов возвращаем стандартную ошибку Django
            raise

    def process_exception(self, request, exception):
        logger.error(f"Exception in {request.path}: {str(exception)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Возвращаем JSON ошибку для API запросов
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': 'Internal server error',
                'detail': str(exception) if settings.DEBUG else 'Something went wrong'
            }, status=500)
        
        # Для обычных запросов позволяем Django обработать ошибку
        return None 