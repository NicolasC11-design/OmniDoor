from django.urls import path
from accesos.views import RegisterView, LoginView, AdminGestionCuentasView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', LoginView.as_view(), name='auth_login'),


    path('admin/usuarios-pendientes/', AdminGestionCuentasView.as_view(), name='usuarios_pendientes'),
    path('admin/aprobar-usuario/<str:id_usuario>/', AdminGestionCuentasView.as_view(), name='aprobar_usuario'),
]