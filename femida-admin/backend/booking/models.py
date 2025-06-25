from django.contrib.auth.models import AbstractUser
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField

class User(AbstractUser):
    ROLE_CHOICES = [
        ("superadmin", "Супер Админ"),
        ("admin", "Админ"),
    ]
    role = models.CharField("Роль", max_length=20, choices=ROLE_CHOICES, default="admin")
    phone = PhoneNumberField("Телефон", blank=True, null=True)
    last_seen = models.DateTimeField("Последняя активность", auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def is_online(self):
        """Проверяет, онлайн ли пользователь (активен в последние 5 минут)"""
        from django.utils import timezone
        from datetime import timedelta
        return self.last_seen >= timezone.now() - timedelta(minutes=5)

    class Meta:
        verbose_name = 'Сотрудник'
        verbose_name_plural = 'Сотрудники'

class Room(models.Model):
    ROOM_CLASS_CHOICES = [
        ('standard', 'Стандарт'),
        ('semi_lux', 'Полу-люкс'),
        ('lux', 'Люкс'),
    ]
    number = models.CharField('Номер комнаты', max_length=10, unique=True)
    room_class = models.CharField('Класс', max_length=10, choices=ROOM_CLASS_CHOICES)
    capacity = models.PositiveIntegerField('Вместимость', default=1)
    floor = models.PositiveIntegerField('Этаж', default=1)
    description = models.TextField('Описание', blank=True)

    def __str__(self):
        return f"{self.get_room_class_display()} №{self.number}"

    class Meta:
        verbose_name = 'Номер'
        verbose_name_plural = 'Номера'

class Guest(models.Model):
    full_name = models.CharField('ФИО', max_length=255)
    inn = models.CharField('ИНН', max_length=20)
    phone = PhoneNumberField('Телефон')

    def __str__(self):
        return self.full_name

    class Meta:
        verbose_name = 'Гость'
        verbose_name_plural = 'Гости'

class Booking(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, verbose_name='Комната')
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, verbose_name='Гость')
    date_from = models.DateField('Дата заезда')
    date_to = models.DateField('Дата выезда')
    created_at = models.DateTimeField('Создано', auto_now_add=True)

    def __str__(self):
        return f"{self.room} — {self.guest} ({self.date_from} - {self.date_to})"

    class Meta:
        verbose_name = 'Бронирование'
        verbose_name_plural = 'Бронирования'
