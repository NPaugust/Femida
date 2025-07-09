from django.contrib.auth.models import AbstractUser
from django.db import models
from phonenumber_field.modelfields import PhoneNumberField
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

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

class Building(models.Model):
    name = models.CharField(max_length=100, verbose_name="Название корпуса")
    address = models.CharField(max_length=255, verbose_name="Адрес")

    def __str__(self):
        return self.name

class Room(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="rooms", verbose_name="Корпус")
    number = models.CharField(max_length=10, verbose_name="Номер комнаты")
    capacity = models.PositiveIntegerField(verbose_name="Вместимость")
    room_type = models.CharField(max_length=50, verbose_name="Тип комнаты")
    room_class = models.CharField(
        max_length=40,
        choices=[
            ('standard', 'Стандарт'),
            ('lux', 'Люкс'),
            ('semi_lux', 'Полу-люкс'),
            ('vip', 'ВИП'),
            ('proraba', 'Дом прораба'),
            ('aurora', 'Аврора'),
            ('domik', 'Домик'),
            ('three_floor_lux', '3-х этажка люкс'),
            ('middle_vip_lux', 'Средний ВИП люкс'),
            ('pink', 'Розовый'),
            ('sklad', 'Склад'),
            ('other', 'Другое'),
        ],
        default='standard',
        verbose_name="Класс комнаты"
    )
    status = models.CharField(
        max_length=20,
        choices=[('free', 'Свободен'), ('busy', 'Занят'), ('repair', 'На ремонте')],
        default='free',
        verbose_name="Статус"
    )
    description = models.TextField(blank=True, verbose_name="Описание")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    price_per_night = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name="Цена за сутки")
    rooms_count = models.PositiveIntegerField(default=1, verbose_name="Количество комнат")
    amenities = models.CharField(max_length=255, blank=True, verbose_name="Удобства (через запятую)")

    def __str__(self):
        return f"{self.building.name} - {self.number}"

class Guest(models.Model):
    full_name = models.CharField(max_length=100, verbose_name="ФИО")
    phone = models.CharField(max_length=20, verbose_name="Телефон")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.CharField(max_length=255, blank=True, verbose_name="Адрес")
    people_count = models.PositiveIntegerField(default=1, verbose_name="Количество человек")
    notes = models.TextField(blank=True, verbose_name="Примечания")
    inn = models.CharField(max_length=20, blank=True, verbose_name="ИНН")
    registration_date = models.DateField(auto_now_add=True, verbose_name="Дата регистрации")
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Общая сумма потраченная")
    visits_count = models.PositiveIntegerField(default=0, verbose_name="Количество посещений")
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Активный'),
            ('inactive', 'Неактивный'),
            ('vip', 'ВИП'),
            ('blacklist', 'Чёрный список'),
        ],
        default='active',
        verbose_name="Статус"
    )

    def __str__(self):
        return self.full_name

class Booking(models.Model):
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name="bookings", verbose_name="Гость")
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="bookings", verbose_name="Комната")
    check_in = models.DateField(verbose_name="Дата заезда")
    check_out = models.DateField(verbose_name="Дата выезда")
    people_count = models.PositiveIntegerField(verbose_name="Количество гостей")
    status = models.CharField(
        max_length=20,
        choices=[('active', 'Активно'), ('completed', 'Завершено'), ('cancelled', 'Отменено')],
        default='active',
        verbose_name="Статус"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Ожидает оплаты'),
            ('paid', 'Оплачено'),
            ('partial', 'Частично оплачено'),
            ('cancelled', 'Отменено'),
        ],
        default='pending',
        verbose_name="Статус оплаты"
    )
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Сумма оплаты")
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Наличные'),
            ('card', 'Банковская карта'),
            ('transfer', 'Банковский перевод'),
            ('online', 'Онлайн оплата'),
            ('other', 'Другое'),
        ],
        default='cash',
        verbose_name="Способ оплаты"
    )
    comments = models.TextField(blank=True, verbose_name="Комментарии")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Общая сумма")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Кто создал")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")

    def __str__(self):
        return f"{self.guest.full_name} - {self.room} ({self.check_in} - {self.check_out})"

    def save(self, *args, **kwargs):
        # Автоматически рассчитываем общую сумму на основе цены номера и количества дней
        if self.room and self.check_in and self.check_out:
            from datetime import timedelta
            days = (self.check_out - self.check_in).days
            self.total_amount = self.room.price_per_night * days
        super().save(*args, **kwargs)

    @property
    def date_from(self):
        """Совместимость с фронтендом"""
        return self.check_in

    @property
    def date_to(self):
        """Совместимость с фронтендом"""
        return self.check_out

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Пользователь")
    action = models.CharField(max_length=100, verbose_name="Действие")
    object_type = models.CharField(max_length=100, verbose_name="Тип объекта")
    object_id = models.PositiveIntegerField(verbose_name="ID объекта")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Время")
    details = models.TextField(blank=True, verbose_name="Детали")

    def __str__(self):
        return f"{self.user} {self.action} {self.object_type} {self.object_id} {self.timestamp}"

@receiver(post_save, sender=Booking)
def log_booking_save(sender, instance, created, **kwargs):
    action = 'Создание' if created else 'Изменение'
    AuditLog.objects.create(
        user=instance.created_by,
        action=action,
        object_type='Booking',
        object_id=instance.id,
        details=f'Бронирование: {instance.guest} в {instance.room} с {instance.check_in} по {instance.check_out}, гостей: {instance.people_count}'
    )

@receiver(post_delete, sender=Booking)
def log_booking_delete(sender, instance, **kwargs):
    AuditLog.objects.create(
        user=instance.created_by,
        action='Удаление',
        object_type='Booking',
        object_id=instance.id,
        details=f'Удалено бронирование: {instance.guest} в {instance.room} с {instance.check_in} по {instance.check_out}, гостей: {instance.people_count}'
    )

@receiver(post_save, sender=Room)
def log_room_save(sender, instance, created, **kwargs):
    action = 'Создание' if created else 'Изменение'
    AuditLog.objects.create(
        user=None,
        action=action,
        object_type='Room',
        object_id=instance.id,
        details=f'Комната: {instance.building} {instance.number}, вместимость: {instance.capacity}, тип: {instance.room_type}, статус: {instance.status}'
    )

@receiver(post_delete, sender=Room)
def log_room_delete(sender, instance, **kwargs):
    AuditLog.objects.create(
        user=None,
        action='Удаление',
        object_type='Room',
        object_id=instance.id,
        details=f'Удалена комната: {instance.building} {instance.number}, вместимость: {instance.capacity}, тип: {instance.room_type}, статус: {instance.status}'
    )

@receiver(post_save, sender=Guest)
def log_guest_save(sender, instance, created, **kwargs):
    action = 'Создание' if created else 'Изменение'
    AuditLog.objects.create(
        user=None,
        action=action,
        object_type='Guest',
        object_id=instance.id,
        details=f'Гость: {instance.full_name}, телефон: {instance.phone}, людей: {instance.people_count}'
    )

@receiver(post_delete, sender=Guest)
def log_guest_delete(sender, instance, **kwargs):
    AuditLog.objects.create(
        user=None,
        action='Удаление',
        object_type='Guest',
        object_id=instance.id,
        details=f'Удалён гость: {instance.full_name}, телефон: {instance.phone}, людей: {instance.people_count}'
    )
