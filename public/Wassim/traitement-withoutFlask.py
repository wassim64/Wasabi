import json
import ijson
from collections import defaultdict
from tqdm import tqdm  # Pour ajouter une barre de progression

def process_choropleth_data(output_path='./choropleth_data.json',  start_year=1950, end_year=2022, limit=3000000):
    """
    Traite les données d'album pour générer des statistiques par pays et par genre.
    
    Args:
        output_path (str): Chemin où sauvegarder le fichier JSON
        limit (int): Nombre maximum d'albums à traiter
    """
    json_file_path = '../json/album.json'
    genre_by_country = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    print(f"Démarrage du traitement des données...")
    
    try:
        with open(json_file_path, 'r', encoding='utf-8') as file:
            print(f"[INFO] Lecture du fichier {json_file_path}")
            
            # Utilisation de tqdm pour afficher une barre de progression
            for i, obj in enumerate(tqdm(ijson.items(file, 'item'), total=limit, desc="Traitement des albums")):
                if i >= limit:
                    break
                    
                country = obj.get('country')
                genre = obj.get('genre')
                publication_date = obj.get('publicationDate') 

                if country and genre and publication_date:
                    try:
                        year = int(publication_date)
                        if start_year <= year <= end_year:
                            genre_by_country[country][genre][year] += 1
                    except ValueError:
                        print(f"[WARNING] Invalid publicationDate format for entry: {publication_date}")

        # Conversion du defaultdict en dictionnaire standard pour la sérialisation JSON
        output_data = {country: {genre: dict(years) for genre, years in genres.items()}
                       for country, genres in genre_by_country.items()}
        

        # Sauvegarde des données dans un fichier JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"[INFO] Traitement terminé. Données sauvegardées dans {output_path}")
        print(f"[INFO] Nombre de pays traités: {len(genre_by_country)}")
        
        # Afficher quelques statistiques
        total_entries = sum(
            sum(years.values())
            for genres in genre_by_country.values()
            for years in genres.values()
        )
        print(f"[INFO] Nombre total d'entrées traitées: {total_entries}")

    except FileNotFoundError:
        print(f"[ERREUR] Le fichier {json_file_path} n'a pas été trouvé.")
    except Exception as e:
        print(f"[ERREUR] Une erreur est survenue: {str(e)}")



if __name__ == '__main__':
    # Vous pouvez personnaliser le chemin de sortie et la limite
    process_choropleth_data(
        output_path='./choropleth_data.json',
        start_year=1950,
        end_year=2022,
        limit=3000000
    )