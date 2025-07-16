from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import Building, Room, Guest, Booking, AuditLog, User
from .serializers import BuildingSerializer, RoomSerializer, GuestSerializer, BookingSerializer, AuditLogSerializer, UserSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404

# Настройка логирования
logger = logging.getLogger(__name__)

# Create your views here.

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        try:
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in UserViewSet.me: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BuildingViewSet(viewsets.ModelViewSet):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [permissions.IsAuthenticated]

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.filter(is_deleted=False)
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            rooms_data = request.data.get('rooms')
            if rooms_data:
                # bulk create через DRF
                serializer = self.get_serializer(data=rooms_data, many=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()  # DRF корректно обработает many=True
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in RoomViewSet.create: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response({'success': True})
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.restore()
        return Response({'success': True})

class GuestViewSet(viewsets.ModelViewSet):
    queryset = Guest.objects.filter(is_deleted=False)
    serializer_class = GuestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        try:
            logger.info(f"GuestViewSet.list called by user: {request.user}")
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in GuestViewSet.list: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"GuestViewSet.create called by user: {request.user} with data: {request.data}")
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error in GuestViewSet.create: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in GuestViewSet.retrieve: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        try:
            guest = self.perform_update(request, *args, **kwargs)
            return guest
        except Exception as e:
            logger.error(f"Error in GuestViewSet.update: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response({'success': True})
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.restore()
        return Response({'success': True})

    def perform_create(self, serializer):
        guest = serializer.save()
        logger.info(f"Создан новый гость: {guest.full_name}")
        # Здесь можно добавить уведомление о новом госте

    def perform_update(self, request, *args, **kwargs):
        guest = super().perform_update(request, *args, **kwargs)
        logger.info(f"Обновлен гость: {guest.full_name}")
        # Здесь можно добавить уведомление об обновлении
        return guest

    def perform_destroy(self, instance):
        guest_name = instance.full_name
        instance.delete()
        logger.info(f"Удален гость: {guest_name}")
        # Здесь можно добавить уведомление об удалении

    @action(detail=False, methods=['post'])
    def send_message(self, request):
        """Отправка сообщения гостю (SMS или email)"""
        try:
            guest_id = request.data.get('guest_id')
            message_type = request.data.get('type')  # 'sms' или 'email'
            message = request.data.get('message')
            
            if not all([guest_id, message_type, message]):
                return Response(
                    {'error': 'Необходимы guest_id, type и message'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                guest = Guest.objects.get(id=guest_id)
            except Guest.DoesNotExist:
                return Response(
                    {'error': 'Гость не найден'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if message_type == 'sms':
                # Здесь должна быть интеграция с SMS-сервисом
                # Пока просто логируем
                logger.info(f"SMS отправлено гостю {guest.full_name} ({guest.phone}): {message}")
                success_message = f"SMS отправлено на номер {guest.phone}"
                
            elif message_type == 'email':
                if not guest.email:
                    return Response(
                        {'error': 'У гостя не указан email'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Здесь должна быть интеграция с email-сервисом
                # Пока просто логируем
                logger.info(f"Email отправлен гостю {guest.full_name} ({guest.email}): {message}")
                success_message = f"Email отправлен на {guest.email}"
                
            else:
                return Response(
                    {'error': 'Неверный тип сообщения. Используйте "sms" или "email"'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Создаем запись в логе
            AuditLog.objects.create(
                user=request.user,
                action='Отправка сообщения',
                object_type='Guest',
                object_id=guest.id,
                details=f'{message_type.upper()} отправлено гостю {guest.full_name}: {message[:50]}...'
            )
            
            return Response({
                'success': True,
                'message': success_message
            })
            
        except Exception as e:
            logger.error(f"Ошибка отправки сообщения: {str(e)}")
            return Response(
                {'error': 'Ошибка отправки сообщения'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.filter(is_deleted=False)
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        booking = serializer.save(created_by=self.request.user)
        logger.info(f"Создано новое бронирование: {booking.guest.full_name} в {booking.room}")
        # Здесь можно добавить уведомление о новом бронировании

    def perform_update(self, serializer):
        booking = serializer.save()
        logger.info(f"Обновлено бронирование: {booking.guest.full_name} в {booking.room}")
        # Здесь можно добавить уведомление об обновлении

    def perform_destroy(self, instance):
        booking_info = f"{instance.guest.full_name} в {instance.room}"
        instance.delete()
        logger.info(f"Удалено бронирование: {booking_info}")
        # Здесь можно добавить уведомление об удалении

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.soft_delete()
        return Response({'success': True})
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.restore()
        return Response({'success': True})

class AuditLogViewSet(viewsets.ModelViewSet):
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

class TrashViewSet(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, obj_type):
        if obj_type == 'guests':
            data = Guest.objects.filter(is_deleted=True)
            serializer = GuestSerializer(data, many=True)
            return Response(serializer.data)
        elif obj_type == 'rooms':
            data = Room.objects.filter(is_deleted=True)
            serializer = RoomSerializer(data, many=True)
            return Response(serializer.data)
        elif obj_type == 'bookings':
            data = Booking.objects.filter(is_deleted=True)
            serializer = BookingSerializer(data, many=True)
            return Response(serializer.data)
        return Response({'error': 'Invalid type'}, status=400)

    def post(self, request, action, obj_type, obj_id):
        model_map = {
            'guests': Guest,
            'rooms': Room,
            'bookings': Booking,
        }
        model = model_map.get(obj_type)
        if not model:
            return Response({'error': 'Invalid type'}, status=400)
        instance = get_object_or_404(model, id=obj_id)
        if action == 'restore':
            instance.restore()
            return Response({'success': True})
        elif action == 'delete':
            instance.delete()
            return Response({'success': True})
        return Response({'error': 'Invalid action'}, status=400)
