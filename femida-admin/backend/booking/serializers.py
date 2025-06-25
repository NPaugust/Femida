from rest_framework import serializers
from .models import User, Room, Guest, Booking

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

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ('id', 'number', 'room_class', 'description')

class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ('id', 'full_name', 'inn', 'phone')

class BookingSerializer(serializers.ModelSerializer):
    room = RoomSerializer(read_only=True)
    guest = GuestSerializer(read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), source='room', write_only=True)
    guest_id = serializers.PrimaryKeyRelatedField(queryset=Guest.objects.all(), source='guest', write_only=True)

    class Meta:
        model = Booking
        fields = ('id', 'room', 'guest', 'room_id', 'guest_id', 'date_from', 'date_to', 'created_at') 