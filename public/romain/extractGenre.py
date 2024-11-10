import ijson

def extract_genres(json_file_path):
    genres = set()  # Utiliser un ensemble pour éviter les doublons

    with open(json_file_path, 'r', encoding='utf-8') as file:
        i=0
        for obj in ijson.items(file, 'item'):
            if i<10000 :
                album_genre = obj.get('album_genre')
                if album_genre:  # Vérifie que le genre n'est pas vide
                    genres.add(album_genre)  # Ajoute le genre dans l'ensemble
                i +=1        

    # Affiche tous les genres uniques
    print("Genres uniques extraits :")
    for genre in genres:
        print(genre)

    return genres

# Exemple d'appel
json_file_path = '../json/song.json'
extract_genres(json_file_path)
