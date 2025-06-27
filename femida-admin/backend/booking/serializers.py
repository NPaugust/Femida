from rest_framework import serializers
from .models import User, Room, Guest, Booking, AuditLog, Building

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
        return {'id': obj.building.id, 'name': obj.building.name}
    def get_room_class(self, obj):
        return {'value': obj.room_class, 'label': obj.get_room_class_display()}
    class Meta:
        model = Room
        fields = ['id', 'building', 'building_id', 'number', 'capacity', 'room_type', 'room_class', 'status', 'description']

class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = '__all__'

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
        }
    class Meta:
        model = Booking
        fields = [
            'id', 'guest', 'guest_id', 'room', 'room_id',
            'check_in', 'check_out', 'people_count', 'status', 'created_by', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__' 