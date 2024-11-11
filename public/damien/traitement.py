import json
import ijson
import os
from collections import defaultdict
from itertools import combinations
from tqdm import tqdm  # Pour la barre de progression

def clean_genre_name(genre):
    # Nettoyer les caractères HTML
    cleaned = genre.replace('&#x200e;', '').replace('&#x200f;', '')
    # Si après nettoyage le genre est différent, on peut ajouter un suffixe pour le différencier
    if cleaned != genre:
        return f"{cleaned} (variant)"
    return cleaned

def process_genre_connections():
    # Configuration des chemins
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_dir = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Documents', 'Dev', 'Wasabi', 'public', 'json')
    songs_path = os.path.join(json_dir, 'song.json')
    artists_path = os.path.join(json_dir, 'artist-without-members.json')
    cache_path = os.path.join(base_dir, 'cache')

    # Afficher les chemins pour debug
    print("Chemins des fichiers :")
    print(f"Base dir: {base_dir}")
    print(f"JSON dir: {json_dir}")
    print(f"Songs path: {songs_path}")
    print(f"Artists path: {artists_path}")
    
    # Vérifier l'existence des dossiers et fichiers
    print("\nVérification des chemins :")
    print(f"JSON dir exists: {os.path.exists(json_dir)}")
    print(f"Songs file exists: {os.path.exists(songs_path)}")
    print(f"Artists file exists: {os.path.exists(artists_path)}")

    # Vérification initiale
    if not os.path.exists(songs_path) or not os.path.exists(artists_path):
        raise FileNotFoundError(f"Fichiers JSON introuvables\nCherché dans : {json_dir}")

    try:
        # Initialisation des structures de données
        artist_genres = defaultdict(set)
        genre_connections = defaultdict(lambda: defaultdict(int))
        genre_details = defaultdict(lambda: {
            'song_count': 0,
            'artist_count': 0,
            'avg_duration': 0,
            'total_duration': 0,
            'years': defaultdict(int),
            'countries': defaultdict(int)
        })

        # Traitement des artistes
        print("Traitement des artistes...")
        with open(artists_path, 'r', encoding='utf-8') as file:
            for artist in tqdm(ijson.items(file, 'item'), desc="Artistes"):
                artist_id = artist.get('id_artist_deezer')
                if artist_id:
                    main_genre = clean_genre_name(artist.get('main_genre', '').lower())
                    if main_genre:
                        artist_genres[artist_id].add(main_genre)

        # Traitement des chansons
        print("Traitement des chansons...")
        with open(songs_path, 'r', encoding='utf-8') as file:
            for song in tqdm(ijson.items(file, 'item'), desc="Chansons"):
                artist_id = song.get('id_artist_deezer')
                album_genre = song.get('album_genre', '').lower()
                duration = int(song.get('duration', 0))
                
                # Extraire l'année de publicationDate
                publication_date = song.get('publicationDate', '')
                year = publication_date[:4] if publication_date else None  # Prend les 4 premiers caractères (l'année)
                
                country = song.get('country', '').lower()
                
                if artist_id and album_genre:
                    album_genre = clean_genre_name(album_genre)
                    artist_genres[artist_id].add(album_genre)
                    genre_details[album_genre]['song_count'] += 1
                    genre_details[album_genre]['total_duration'] += duration
                    
                    # Ajouter l'année si elle existe
                    if year and year.isdigit():  # Vérifie que c'est bien un nombre
                        genre_details[album_genre]['years'][int(year)] += 1
                    
                    if country:
                        genre_details[album_genre]['countries'][country] += 1

        # Calcul des connexions
        print("Calcul des connexions entre genres...")
        for artist_id, genres in tqdm(artist_genres.items(), desc="Connexions"):
            for genre in genres:
                genre_details[genre]['artist_count'] += 1
            for genre1, genre2 in combinations(genres, 2):
                genre_connections[genre1][genre2] += 1
                genre_connections[genre2][genre1] += 1

        # Préparation des données pour D3.js
        print("Préparation des données finales...")
        nodes = [
            {
                'id': genre,
                'songCount': details['song_count'],
                'artistCount': details['artist_count'],
                'avgDuration': details['avg_duration'],
                'years': details['years'],
                'countries': details['countries']
            }
            for genre, details in genre_details.items()
            if details['song_count'] > 0
        ]

        edges = [
            {
                'source': genre1,
                'target': genre2,
                'weight': weight
            }
            for genre1 in genre_connections
            for genre2, weight in genre_connections[genre1].items()
            if weight > 0
        ]

        # Sauvegarde des résultats
        network_data = {'nodes': nodes, 'links': edges}
        output_path = os.path.join(base_dir, 'genre_network.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(network_data, f, ensure_ascii=False, indent=2)

        print(f"Traitement terminé avec succès!")
        print(f"Nœuds: {len(nodes)}, Liens: {len(edges)}")

    except Exception as e:
        print(f"Erreur lors du traitement : {str(e)}")

if __name__ == '__main__':
    process_genre_connections()