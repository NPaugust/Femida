from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Guest

# Create your tests here.

class GuestApiTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.guest = Guest.objects.create(full_name='Тестовый Гость', inn='12345678901234', phone='+996700000000')

    def test_guest_list(self):
        url = reverse('guest-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
