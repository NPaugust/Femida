from django.core.management.base import BaseCommand
from booking.models import User


class Command(BaseCommand):
    help = 'Исправляет настройки существующих пользователей для работы с фронтендом'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Имя пользователя для исправления (если не указано, исправляются все)')

    def handle(self, *args, **options):
        username = options.get('username')
        
        if username:
            # Исправляем конкретного пользователя
            try:
                user = User.objects.get(username=username)
                self.fix_user(user)
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Пользователь {username} не найден')
                )
        else:
            # Исправляем всех пользователей
            users = User.objects.all()
            fixed_count = 0
            
            for user in users:
                if self.fix_user(user):
                    fixed_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Исправлено пользователей: {fixed_count} из {users.count()}'
                )
            )

    def fix_user(self, user):
        """Исправляет настройки пользователя"""
        changes = []
        
        # Проверяем и исправляем роль
        if not user.role:
            user.role = 'admin'
            changes.append('роль установлена как "admin"')
        
        # Проверяем и исправляем is_staff
        if not user.is_staff:
            user.is_staff = True
            changes.append('is_staff установлен как True')
        
        # Проверяем и исправляем is_active
        if not user.is_active:
            user.is_active = True
            changes.append('is_active установлен как True')
        
        # Для супер-админов устанавливаем is_superuser
        if user.role == 'superadmin' and not user.is_superuser:
            user.is_superuser = True
            changes.append('is_superuser установлен как True')
        
        if changes:
            user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Пользователь {user.username}: {", ".join(changes)}'
                )
            )
            return True
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Пользователь {user.username}: настройки уже корректны'
                )
            )
            return False 