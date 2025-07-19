from django.core.management.base import BaseCommand
from booking.models import User
from django.contrib.auth.hashers import make_password


class Command(BaseCommand):
    help = 'Создает админа с правильными настройками'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, required=True, help='Имя пользователя')
        parser.add_argument('--password', type=str, required=True, help='Пароль')
        parser.add_argument('--first-name', type=str, default='', help='Имя')
        parser.add_argument('--last-name', type=str, default='', help='Фамилия')
        parser.add_argument('--phone', type=str, default='', help='Телефон')
        parser.add_argument('--email', type=str, default='', help='Email')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']
        phone = options['phone']
        email = options['email']

        # Проверяем, существует ли пользователь
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Пользователь {username} уже существует')
            )
            return

        # Создаем админа
        user = User.objects.create(
            username=username,
            password=make_password(password),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            email=email,
            role='admin',
            is_staff=True,
            is_superuser=False,
            is_active=True
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Админ {username} успешно создан!'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'Роль: {user.get_role_display()}'
            )
        ) 