# Generated by Django 5.2.3 on 2025-07-17 18:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('booking', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='building',
            name='description',
            field=models.TextField(blank=True, verbose_name='Описание'),
        ),
    ]
