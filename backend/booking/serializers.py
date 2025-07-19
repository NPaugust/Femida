from rest_framework import serializers
from django.db.models import Sum
from .models import User, Room, Guest, Booking, AuditLog, Building
import logging

logger = logging.getLogger(__name__)

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'role', 'phone', 'email', 'first_name', 'last_name', 'password', 'is_online')

    def get_is_online(self, obj):
        return obj.is_online()

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    building = serializers.SerializerMethodField()
    building_id = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all(), source='building', write_only=True)
    # room_class теперь двустороннее поле (и на чтение, и на запись)
    room_class = serializers.CharField(required=True)
    room_class_display = serializers.SerializerMethodField(read_only=True)
    
    def get_building(self, obj):
        if isinstance(obj, dict):
            return {'id': obj['building'], 'name': ''}
        return {'id': obj.building.id, 'name': obj.building.name}
    
    def get_room_class_display(self, obj):
        return {'value': obj.room_class, 'label': obj.get_room_class_display()}
    
    def validate_status(self, value):
        """Валидация статуса номера"""
        if self.instance and value == 'free':
            # Проверяем, есть ли активные бронирования для этого номера
            active_bookings = self.instance.bookings.filter(
                status='active',
                is_deleted=False
            )
            if active_bookings.exists():
                raise serializers.ValidationError(
                    "Номер забронирован. Сначала отмените или завершите бронирование."
                )
        return value
    
    def validate_capacity(self, value):
        """Валидация вместимости"""
        if value < 1:
            raise serializers.ValidationError("Вместимость должна быть больше 0")
        if value > 10:
            raise serializers.ValidationError("Вместимость не может быть больше 10")
        return value
    
    def validate_price_per_night(self, value):
        """Валидация цены"""
        if value < 0:
            raise serializers.ValidationError("Цена не может быть отрицательной")
        return value
    
    class Meta:
        model = Room
        fields = [
            'id', 'building', 'building_id', 'number', 'capacity', 'room_type', 'room_class', 'room_class_display', 'status', 'description',
            'is_active', 'price_per_night', 'rooms_count', 'amenities', 'is_deleted'
        ]
        read_only_fields = ['is_deleted']

class GuestSerializer(serializers.ModelSerializer):
    total_spent = serializers.SerializerMethodField()
    
    class Meta:
        model = Guest
        fields = '__all__'
        read_only_fields = ['is_deleted']
    
    def get_total_spent(self, obj):
        """Вычисляет общую сумму оплаченных бронирований гостя"""
        from decimal import Decimal
        total = obj.bookings.filter(
            payment_status='paid',
            is_deleted=False
        ).aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')
        return str(total)

    def validate_full_name(self, value):
        """Валидация ФИО"""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError("ФИО должно содержать минимум 2 символа")
        return value.strip()

    def validate_phone(self, value):
        """Валидация телефона"""
        if not value:
            raise serializers.ValidationError("Номер телефона обязателен")
        
        # Убираем все пробелы и дефисы
        cleaned_phone = value.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Проверяем, что номер начинается с + и содержит только цифры после +
        if not cleaned_phone.startswith('+'):
            raise serializers.ValidationError("Номер телефона должен начинаться с +")
        
        # Проверяем длину (минимум 7 цифр после +)
        digits_after_plus = ''.join(filter(str.isdigit, cleaned_phone[1:]))
        if len(digits_after_plus) < 7:
            raise serializers.ValidationError("Номер телефона должен содержать минимум 7 цифр")
        
        return cleaned_phone

    def validate_inn(self, value):
        """Валидация ИНН"""
        if value:
            # Убираем пробелы
            cleaned_inn = value.replace(' ', '')
            
            # Проверяем, что ИНН содержит только цифры
            if not cleaned_inn.isdigit():
                raise serializers.ValidationError("ИНН должен содержать только цифры")
            
            # Проверяем длину (14 цифр для Кыргызстана)
            if len(cleaned_inn) != 14:
                raise serializers.ValidationError("ИНН должен содержать ровно 14 цифр")
            
            return cleaned_inn
        return value

    def validate_people_count(self, value):
        """Валидация количества людей"""
        if value < 1:
            raise serializers.ValidationError("Количество людей должно быть больше 0")
        if value > 10:
            raise serializers.ValidationError("Количество людей не может быть больше 10")
        return value

    def create(self, validated_data):
        try:
            logger.info(f"Creating guest with data: {validated_data}")
            return super().create(validated_data)
        except Exception as e:
            logger.error(f"Error creating guest: {str(e)}")
            raise serializers.ValidationError(f"Ошибка при создании гостя: {str(e)}")

    def update(self, instance, validated_data):
        try:
            logger.info(f"Updating guest {instance.id} with data: {validated_data}")
            return super().update(instance, validated_data)
        except Exception as e:
            logger.error(f"Error updating guest {instance.id}: {str(e)}")
            raise serializers.ValidationError(f"Ошибка при обновлении гостя: {str(e)}")

class BookingSerializer(serializers.ModelSerializer):
    guest = GuestSerializer(read_only=True)
    guest_id = serializers.PrimaryKeyRelatedField(queryset=Guest.objects.all(), source='guest', write_only=True)
    room = serializers.SerializerMethodField()
    room_id = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), source='room', write_only=True)
    
    def get_room(self, obj):
        r = obj.room
        return {
            'id': r.id,
            'number': r.number,
            'building': {'id': r.building.id, 'name': r.building.name},
            'room_class': {'value': r.room_class, 'label': r.get_room_class_display()},
            'capacity': r.capacity,
            'room_type': r.room_type,
            'status': r.status,
            'price_per_night': r.price_per_night,
        }
    
    def validate(self, data):
        """Валидация данных бронирования"""
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        people_count = data.get('people_count')
        room = data.get('room')
        
        # Валидация дат
        if check_in and check_out:
            if check_in >= check_out:
                raise serializers.ValidationError(
                    "Дата выезда должна быть позже даты заезда"
                )
            
            # Проверяем, что дата заезда не в прошлом
            from django.utils import timezone
            if check_in < timezone.now():
                raise serializers.ValidationError(
                    "Дата заезда не может быть в прошлом"
                )
        
        # Валидация количества гостей
        if people_count and room:
            if people_count > room.capacity:
                raise serializers.ValidationError(
                    f"Номер вмещает максимум {room.capacity} гостей"
                )
            if people_count < 1:
                raise serializers.ValidationError(
                    "Количество гостей должно быть больше 0"
                )
        
        # Проверка доступности номера
        if check_in and check_out and room:
            conflicting_bookings = Booking.objects.filter(
                room=room,
                status='active',
                is_deleted=False
            ).exclude(id=self.instance.id if self.instance else None)
            
            # Проверяем пересечение дат
            for booking in conflicting_bookings:
                if (check_in < booking.check_out and check_out > booking.check_in):
                    raise serializers.ValidationError(
                        f"Номер уже забронирован на эти даты (бронирование #{booking.id})"
                    )
        
        return data
    
    class Meta:
        model = Booking
        fields = [
            'id', 'guest', 'guest_id', 'room', 'room_id',
            'check_in', 'check_out', 'people_count', 'status', 
            'payment_status', 'payment_amount', 'payment_method', 'comments', 'total_amount',
            'created_by', 'created_at', 'is_deleted'
        ]
        read_only_fields = ['created_by', 'created_at', 'is_deleted']

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__' 