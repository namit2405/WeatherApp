from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests

API_KEY = "0ed46835aec69a7b657717db9b86d0ff"
BASE_URL = "http://api.openweathermap.org/data/2.5"

@api_view(['GET'])
def get_weather(request):
    lat = request.GET.get('lat')
    lon = request.GET.get('lon')
    city = request.GET.get('city')

    if lat and lon:
        url = f"{BASE_URL}/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    elif city:
        url = f"{BASE_URL}/weather?q={city}&appid={API_KEY}&units=metric"
    else:
        return Response({"error": "Provide either lat/lon or city"}, status=400)

    weather_data = requests.get(url).json()
    return Response(weather_data)


@api_view(['GET'])
def get_forecast(request):
    lat = request.GET.get('lat')
    lon = request.GET.get('lon')
    city = request.GET.get('city')

    if lat and lon:
        url = f"{BASE_URL}/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    elif city:
        url = f"{BASE_URL}/forecast?q={city}&appid={API_KEY}&units=metric"
    else:
        return Response({"error": "Provide either lat/lon or city"}, status=400)

    forecast_data = requests.get(url).json()
    return Response(forecast_data)


@api_view(['GET'])
def geocoding(request):
    query = request.GET.get('q', '')
    url = f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=5&appid={API_KEY}"

    geo_data = requests.get(url).json()
    return Response(geo_data)
