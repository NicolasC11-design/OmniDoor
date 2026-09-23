import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'OmniApi.settings')
django.setup()

from accesos.models import BiometriaUsuario
from django.conf import settings
from cryptography.fernet import Fernet

def migrate():
    print(f"Using FERNET_KEY: {settings.FERNET_KEY}")
    biometrias = BiometriaUsuario.objects.all()
    fernet = Fernet(settings.FERNET_KEY)
    
    count = 0
    for bio in biometrias:
        if bio.vector_facial and bio.vector_facial.strip().startswith('['):
            try:
                vector_json = bio.vector_facial
                encrypted = fernet.encrypt(vector_json.encode()).decode()
                bio.vector_facial = encrypted
                bio.save()
                count += 1
            except Exception as e:
                print(f"Error procesando {bio.id_biometria}: {e}")
        else:
            print(f"Skipping {bio.id_biometria}, ya está encriptado o vacío.")
            
    print(f"Migrados {count} registros biométricos exitosamente.")

if __name__ == '__main__':
    migrate()
