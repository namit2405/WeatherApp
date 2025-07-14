from django.urls import path
from .views import get_weather,get_forecast, geocoding

urlpatterns = [
    path('weather/', get_weather),
    path('forecast/', get_forecast),
    path('geocoding/', geocoding),
 
]
