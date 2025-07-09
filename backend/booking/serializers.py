from rest_framework import serializers
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

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    building = serializers.SerializerMethodField()
    building_id = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all(), source='building', write_only=True)
    room_class = serializers.SerializerMethodField()
    def get_building(self, obj):
        # Если obj — это dict (bulk create), берем из словаря
        if isinstance(obj, dict):
            return {'id': obj['building'], 'name': ''}
        # Если obj — это модель Room
        return {'id': obj.building.id, 'name': obj.building.name}
    def get_room_class(self, obj):
        return {'value': obj.room_class, 'label': obj.get_room_class_display()}
    class Meta:
        model = Room
        fields = [
            'id', 'building', 'building_id', 'number', 'capacity', 'room_type', 'room_class', 'status', 'description',
            'is_active', 'price_per_night', 'rooms_count', 'amenities'
        ]

class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = '__all__'

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
    date_from = serializers.DateField(source='check_in', read_only=True)
    date_to = serializers.DateField(source='check_out', read_only=True)
    
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
        }
    class Meta:
        model = Booking
        fields = [
            'id', 'guest', 'guest_id', 'room', 'room_id',
            'check_in', 'check_out', 'date_from', 'date_to', 'people_count', 'status', 
            'payment_status', 'payment_amount', 'payment_method', 'comments', 'total_amount',
            'created_by', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'total_amount']

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__' 