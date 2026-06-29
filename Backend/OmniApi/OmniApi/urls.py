from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Todo lo que empiece por /api/ va a ser manejado por la app de accesos
    path('api/', include('accesos.urls')),
]