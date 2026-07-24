from django.urls import path
from .views import (
    RegisterView, LoginView, AdminGestionCuentasView, 
    AprobarUsuarioView, VehiculoListCreateView, VehiculoDetailView, 
    RegistroAccesoListCreateView, InformeTurnoCreateView, PerfilUsuarioView, 
    MisRegistrosAccesoView, CambiarPasswordView, AdminDashboardStatsView,
    UsuarioListCreateView, UsuarioDetailUpdateDeleteView,   ValidarPlacaBiometriaView, EnrolarBiometriaView, RegistrarBiometriaView, ValidarAccesoPorteriaView
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
    path('vehiculos/<uuid:id_vehiculo>/', VehiculoDetailView.as_view(), name='vehiculo-detail'),
    path('vehiculos/<uuid:id_vehiculo>/accesos/', RegistroAccesoListCreateView.as_view(), name='vehiculo-accesos'),

    path('accesos/', RegistroAccesoListCreateView.as_view(), name='accesos-list'),
    path('informes-turno/', InformeTurnoCreateView.as_view(), name='informes-create'),

    path('usuarios/historial/mio/', MisRegistrosAccesoView.as_view(), name='mi_historial'),
    path('perfil/actualizar/', PerfilUsuarioView.as_view(), name='actualizar_perfil'),
    path('perfil/cambiar-password/', CambiarPasswordView.as_view(), name='cambiar_password'),

    path('usuarios/<str:id_usuario>/', UsuarioDetailUpdateDeleteView.as_view(), name='usuario-detail'),

    path('stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('usuarios/', UsuarioListCreateView.as_view(), name='usuarios-list'),
    path('usuarios/<uuid:id_usuario>/', UsuarioDetailUpdateDeleteView.as_view(), name='usuario-detail-update-delete'),

    path('biometria/enrolar/', EnrolarBiometriaView.as_view(), name='biometria-enrolar'),
    path('biometria/validar-placa/<str:placa>/', ValidarPlacaBiometriaView.as_view(), name='biometria-validar-placa'),

    path('auth/registrar-biometria/', RegistrarBiometriaView.as_view(), name='registrar-biometria'),

    path('accesos/validar-porteria/', ValidarAccesoPorteriaView.as_view(), name='validar-porteria'),
]