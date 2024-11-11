import json
import ijson
import re
import html

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



def process_json_files(filename_path):
    genres = set()
    with open(filename_path, 'r', encoding='utf-8') as file:
        for song in ijson.items(file, 'item'):
            
            if "genre" in song:
                genres.add(re.sub(r'[\‎\‏\]', '',html.unescape(song['genre'])).lower())
            elif "album_genre" in song:
                genres.add(re.sub(r'[\u200E\u200F]', '',html.unescape(song['album_genre'])).lower())
            else:
                genres.add("Undefined")

    with open('public\json\sous-genre.json', 'w', encoding='utf-8') as json_file:
        list_genre = list(genres)
        json.dump(list_genre, json_file, ensure_ascii=False , indent=4)

def load_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        print(f"Le fichier JSON {file_path} n'existe pas.")
        return None
    except json.JSONDecodeError:
        print(f"Erreur lors du décodage du fichier JSON {file_path}.")
        return None

def extract_genres(subgenres):
    genres = set()

    for item in subgenres:
        main_genre = item.get("genre")
        subgenre_list = item.get("subgenres", [])

        if main_genre:
            genres.add(main_genre) 
        
        if isinstance(subgenre_list, list):
            for sub in subgenre_list:
                if isinstance(sub, dict):  
                    genres.update(extract_genres([sub])) 
                elif isinstance(sub, str): 
                    genres.add(sub)  
    
    return genres

def getGenre(data, search_genre):
    
    def search_in_data(item, parent_path=None):
        if parent_path is None:
            parent_path = []
            
        current_genre = item.get("genre")
        current_path = parent_path + [current_genre] if current_genre else parent_path

        if current_genre == search_genre:
            return {
                "genre": current_genre,
                "parent_genres": parent_path,
                "subgenres": item.get("subgenres", [])
            }

        if "subgenres" in item:
            if isinstance(item["subgenres"], list) and all(isinstance(x, str) for x in item["subgenres"]):
                if search_genre in item["subgenres"]:
                    return {
                        "genre": search_genre,
                        "parent_genres": current_path,
                        "subgenres": []
                    }
            
            for subgenre in item["subgenres"]:
                if isinstance(subgenre, dict):
                    result = search_in_data(subgenre, current_path)
                    if result:
                        return result

        return None

    for genre_data in data:
        result = search_in_data(genre_data)
        if result:
            return result
            
    return {
        "genre": search_genre,
        "error": "Genre non trouvé",
        "parent_genres": [],
        "subgenres": []
    }


# Chemins des fichiers
subgenre_file_path = '../../../json/sous-genre.json'

subgenres = load_json(subgenre_file_path)

