import requests

#URL de l'API
url = "https://wasabi.i3s.unice.fr/api/v1/album/id"

#Faire une requête GET à l'API
response = requests.get(url)

#Vérifier si la requête a réussi
if response.status_code == 200:
    # Récupérer les données au format JSON
    data = response.json()
    print(data)
else:
    print(f"Erreur {response.status_code}: Impossible de récupérer les données.")