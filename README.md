# Translate.pdf

Aplikacja do tłumaczenia plików PDF wspierana przez sztuczną inteligencję (Google Gemini) z opcjonalnym eksportem bezpośrednio do bazy Notion.

![Podgląd aplikacji](preview.png)

## Jak pobrać aplikację z GitHuba?

Możesz pobrać ten kod na swój komputer na dwa sposoby:

### Sposób 1: Szybkie pobranie (Plik ZIP)
Najprostsza metoda, nie wymaga instalacji żadnych dodatkowych programów.
1. Na górze tej strony kliknij zielony przycisk **"<> Code"**.
2. Z rozwiniętego menu wybierz opcję **"Download ZIP"**.
3. Plik pobierze się na Twój komputer. Gdy to nastąpi, po prostu rozpakuj (wypakuj) go do wybranego folderu.

### Sposób 2: Dla programistów (Git Clone)
Jeśli używasz narzędzia Git i terminala, wpisz w konsoli:
```bash
git clone <tutaj_wklej_link_do_repozytorium>
```

## Jak uruchomić aplikację u siebie na komputerze?

Aby uruchomić aplikację z pobranych plików, musisz mieć zainstalowany na komputerze darmowy program **Node.js** (do pobrania z nodejs.org).

**Co to jest Terminal?**
Terminal (lub Wiersz Polecenia) to nie jest żaden plik w naszym ZIPie, tylko wbudowany program w systemie Windows lub Mac, który wygląda jak czarne okienko do wpisywania tekstu. 

Oto jak uruchomić aplikację krok po kroku:
1. **Otwórz Terminal wewnątrz folderu z aplikacją**:
   * **Na Windows**: Wejdź do rozpakowanego folderu z aplikacją, kliknij prawym przyciskiem myszy w puste tło i wybierz "Otwórz w terminalu" (Open in Terminal). Możesz też wpisać `cmd` w pasku adresu folderu u góry okna i wcisnąć Enter.
   * **Na Macu**: Na dole folderu kliknij w niego prawym przyciskiem myszy (lub z Control) i wybierz "Nowy terminal w tym folderze" (New Terminal at Folder).
2. W czarnym oknie, które się pojawi, wpisz polecenie, aby komputer pobrał wymagane narzędzia i wciśnij Enter:
   `npm install`
3. Gdy instalacja się zakończy, uruchom w tym samym okienku aplikację wpisując:
   `npm run dev`
4. Aplikacja powinna się uruchomić. W oknie tekstowym pojawi się link (np. `http://localhost:5173/`). Skopiuj go i wklej do swojej zwykłej przeglądarki internetowej (np. Chrome czy Edge).

## Sponsor
Jeśli ta aplikacja Ci się przydaje, możesz postawić twórcy wirtualną kawę korzystając z przycisku "Sponsor" na górze profilu! ☕
