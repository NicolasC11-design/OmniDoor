from django.urls import path
from .views import (
    RegisterView, LoginView, AdminGestionCuentasView, 
    AprobarUsuarioView, VehiculoListCreateView, VehiculoDetailView, 
    RegistroAccesoListCreateView, InformeTurnoCreateView, PerfilUsuarioView, 
    MisRegistrosAccesoView, CambiarPasswordView, AdminDashboardStatsView,
    UsuarioListCreateView, UsuarioDetailUpdateDeleteView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', LoginView.as_view(), name='auth_login'),

    path('admin/usuarios-pendientes/', AdminGestionCuentasView.as_view(), name='usuarios_pendientes'),
    path('admin/aprobar-usuario/<uuid:id_usuario>/', AprobarUsuarioView.as_view(), name='aprobar_usuario'),
    
    path('usuarios/vehiculos/todos/', VehiculoListCreateView.as_view(), name='vehiculos_todos'),
    path('usuarios/vehiculos/agregar/', VehiculoListCreateView.as_view(), name='vehiculos_agregar'),
    path('usuarios/vehiculos/actualizar/<str:id_vehiculo>/', VehiculoDetailView.as_view(), name='vehiculo_actualizar'),
    path('usuarios/vehiculos/eliminar/<str:id_vehiculo>/', VehiculoDetailView.as_view(), name='vehiculo_eliminar'),

    path('accesos/', RegistroAccesoListCreateView.as_view(), name='accesos-list'),
    path('informes-turno/', InformeTurnoCreateView.as_view(), name='informes-create'),

    path('usuarios/historial/mio/', MisRegistrosAccesoView.as_view(), name='mi_historial'),
    path('perfil/actualizar/', PerfilUsuarioView.as_view(), name='actualizar_perfil'),
    path('perfil/cambiar-password/', CambiarPasswordView.as_view(), name='cambiar_password'),

    path('usuarios/<str:id_usuario>/', UsuarioDetailUpdateDeleteView.as_view(), name='usuario-detail'),

    path('stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('usuarios/', UsuarioListCreateView.as_view(), name='usuarios-list'),
]