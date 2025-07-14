from django import forms

class CityForm(forms.Form):
    city = forms.CharField(label='Enter the location', max_length=100)
