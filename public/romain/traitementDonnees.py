import json
import ijson
from collections import defaultdict
from datetime import datetime
import os

date_format = "%Y-%m-%d"
cache_path = 'cache'  # Répertoire de cache

def is_valid_date(date_str):
    if date_str[-2:] == '00':
        date_str = date_str[:-2] + '01'  
    try:
        datetime.strptime(date_str, date_format)
        return True
    except ValueError:
        return False

def process_songs_by_genre():
    # Chemins des fichiers
    songs_path = '../json/song.json'
    artists_path = '../json/artist-without-members.json'
    output_songs_path = 'output_songs_by_genre.json'
    print("aaaaa")
    # Vérifier si les données en cache existent
    if os.path.exists(f'{cache_path}_artist_names.json') and os.path.exists(f'{cache_path}_artist_songs.json'):
        print("Chargement des données en cache...")
        # Charger les données en cache
        with open(f'{cache_path}_artist_names.json', 'r', encoding='utf-8') as f:
            artist_names = json.load(f)
        with open(f'{cache_path}_artist_songs.json', 'r', encoding='utf-8') as f:
            artist_songs = json.load(f)
    else:
        # Structures de données
        artist_names = {}
        artist_songs = defaultdict(list)

        # Charger les noms des artistes
        with open(artists_path, 'r', encoding='utf-8') as file:
            for artist in ijson.items(file, 'item'):
                artist_id = artist.get('id_artist_deezer')
                artist_name = artist.get('name')
                if artist_id and artist_name:
                    artist_names[artist_id] = artist_name

        # Sauvegarder les noms des artistes en cache
        with open(f'{cache_path}_artist_names.json', 'w', encoding='utf-8') as f:
            json.dump(artist_names, f, ensure_ascii=False, indent=4)

        # Traiter les chansons
        with open(songs_path, 'r', encoding='utf-8') as file:
            for song in ijson.items(file, 'item'):
                artist_id = song.get('id_artist_deezer')
                album_genre = song.get('album_genre', '').lower()
                publication_date = song.get('publicationDate')
                song_name = song.get('name')

                # Filtrer par genre
                if artist_id and album_genre != '':
                    if publication_date and publication_date != "0000-00-00" and is_valid_date(publication_date):
                        # Utiliser une clé sous forme de chaîne pour le cache
                        artist_songs[(artist_id, album_genre)].append((publication_date, song_name))

        # Convertir les tuples de clé en chaîne pour la sérialisation JSON
        artist_songs_serialized = {}
        for key, value in artist_songs.items():
            key_str = f'{key[0]}:{key[1]}'  # clé sous forme de chaîne "artist_id:album_genre"
            artist_songs_serialized[key_str] = value

        # Sauvegarder les chansons par artiste en cache
        with open(f'{cache_path}_artist_songs.json', 'w', encoding='utf-8') as f:
            json.dump(artist_songs_serialized, f, ensure_ascii=False, indent=4)

    # Préparer les données de chansons filtrées
    result_data = []
    for key, songs in artist_songs.items():
        artist_id, album_genre = key # Reconvertir la clé en tuple (artist_id, album_genre)
        valid_dates = [song[0] for song in songs if song[0] != "0000-00-00" and is_valid_date(song[0])]
        valid_dates.sort()

        if valid_dates:
            first_song_date = valid_dates[0]
            last_song_date = valid_dates[-1]
            if first_song_date[-2:] == '00':
                first_song_date = first_song_date[:-2] + '01'  
            if last_song_date[-2:] == '00':
                last_song_date = last_song_date[:-2] + '01'  
            date1 = datetime.strptime(first_song_date, date_format)
            date2 = datetime.strptime(last_song_date, date_format)
            date_diff = date2 - date1

            artist_name = artist_names.get(artist_id, "Unknown Artist")

            result_data.append({
                'artist_id': artist_id,
                'artist_name': artist_name,
                'genre': album_genre,
                'first_date': first_song_date,
                'last_date': last_song_date,
                'date_difference': date_diff.days,
                'all_dates': valid_dates
            })

    # Sauvegarder les données filtrées dans output_songs_by_genre.json
    with open(output_songs_path, 'w', encoding='utf-8') as outfile:
        json.dump(result_data, outfile, ensure_ascii=False, indent=4)

if __name__ == '__main__':
    process_songs_by_genre()
