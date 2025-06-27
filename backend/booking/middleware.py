from django.utils import timezone
from .models import User

class UserActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Обновляем last_seen для аутентифицированного пользователя
        if request.user.is_authenticated and not request.user.is_anonymous:
            User.objects.filter(id=request.user.id).update(last_seen=timezone.now())
        
        response = self.get_response(request)
        return response 