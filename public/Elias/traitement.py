import json
import ijson
import os
import dask.dataframe as dd



# Charger les données depuis un fichier JSON
def load_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            return data
    except FileNotFoundError:
        print(f"Le fichier JSON {file_path} n'existe pas.")
        return None
    except json.JSONDecodeError:
        print(f"Erreur lors du décodage du fichier JSON {file_path}.")
        return None

# Manipuler les données JSON (afficher les clés)
def manipulate_data(json_data):
    genres = set()
    for song in json_data:
        genres.add(song['genre'])
    print(f"Genre : {genres}")

def process_json_folder(directory_path):
    for filename in os.listdir(directory_path):
        if filename.endswith('.json'):
            file_path = os.path.join(directory_path, filename)
            
            json_data = load_json(file_path)
            
            if json_data:
                print(f"\nFichier : {filename}")
                # Manipuler les données pour afficher les clés
                manipulate_data(json_data)


def process_json_files(filename_path):
    genres = set()
    with open(filename_path, 'r', encoding='utf-8') as file:
        for song in ijson.items(file, 'item'):  # 'item' pour chaque chanson
            if "genre" in song:
                print(song['genre'])
                genres.add(song['genre'])
            elif "album_genre" in song:
                print(song['album_genre'])
                genres.add(song['album_genre'])
            else:
                print("undefined")
                genres.add("Undefined")
    print(f"Genre : {genres}")

# Chemin du dossier contenant les fichiers JSON
directory_path = 'public/json/song.json'

# Traiter tous les fichiers JSON dans le dossier
process_json_files(directory_path)
