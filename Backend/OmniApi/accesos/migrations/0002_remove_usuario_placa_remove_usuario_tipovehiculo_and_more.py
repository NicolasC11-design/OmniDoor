
import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accesos', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='usuario',
            name='placa',
        ),
        migrations.RemoveField(
            model_name='usuario',
            name='tipoVehiculo',
        ),
        migrations.AddField(
            model_name='usuario',
            name='contacto_emergencia',
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
        migrations.AddField(
            model_name='usuario',
            name='direccion',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='usuario',
            name='nombre_emergencia',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='usuario',
            name='telefono',
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
        migrations.AlterField(
            model_name='usuario',
            name='rol',
            field=models.CharField(default='aprendiz', max_length=20),
        ),
        migrations.CreateModel(
            name='Vehiculo',
            fields=[
                ('id_vehiculo', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tipoVehiculo', models.CharField(max_length=20)),
                ('placa', models.CharField(blank=True, default='N/A', max_length=15, null=True)),
                ('marca', models.CharField(blank=True, default='GENERICA', max_length=50, null=True)),
                ('modelo', models.CharField(blank=True, default='GENERICO', max_length=50, null=True)),
                ('fecha_registro', models.DateTimeField(auto_now_add=True)),
                ('activo', models.BooleanField(default=True)),
                ('propietario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vehiculos', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'vehiculos',
            },
        ),
    ]
