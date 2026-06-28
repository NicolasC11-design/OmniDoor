from django.urls import path
from accesos.views import (
    PerfilUsuarioView, 
    AgregarVehiculoView, 
    CambiarPasswordView, 
    HistorialAccesosView,
    UsuarioListCreateView, 
    UsuarioDetailView,
    AdminGestionCuentasView,
    AprobarUsuarioView,
    TodosLosVehiculosView
)


urlpatterns = [
    path('usuarios/perfil/', PerfilUsuarioView.as_view(), name='perfil'),
    
    path('usuarios/vehiculos/agregar/', AgregarVehiculoView.as_view(), name='agregar_vehiculo'),

    path('usuarios/vehiculos/todos/', TodosLosVehiculosView.as_view(), name='todos-los-vehiculos'),
    
    path('usuarios/cambiar-password/', CambiarPasswordView.as_view(), name='cambiar_password'),

    path('usuarios/historial/', HistorialAccesosView.as_view(), name='historial'),
    
    path('usuarios/', UsuarioListCreateView.as_view(), name='usuario_list'),
    path('usuarios/<uuid:id_usuario>/', UsuarioDetailView.as_view(), name='usuario_detail'),

    path('admin/usuarios-pendientes/', AdminGestionCuentasView.as_view(), name='usuarios-pendientes'),
    
    path('admin/aprobar-usuario/<uuid:id_usuario>/', AprobarUsuarioView.as_view(), name='aprobar-usuario'),
]