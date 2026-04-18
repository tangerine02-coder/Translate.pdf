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

### Częste problemy (Troubleshooting)

**Błąd na systemie Windows "running scripts is disabled on this system":**
Zabezpieczenia Windows (tzw. PowerShell) blokują czasem uruchamianie jakichkolwiek poleceń. Jak to naprawić?
* Otwórz zwykły wiersz polecenia (`cmd`) zamiast PowerShell. Wejdź do folderu z aplikacją, u góry w pasku ze ścieżką (gdzie jest napisane np. `C:\Users\...\Translate-pdf`) skasuj wszystko, wpisz słowo `cmd` i wciśnij Enter. W nowym, czarnym oknie wpisz z powrotem `npm install`.
* ALBO otwórz PowerShell jako administrator i wpisz komendę: `Set-ExecutionPolicy RemoteSigned`, zatwierdzając klikając literę "A" lub "Y" na klawiaturze.

**Błąd podczas budowania (.exe) "Cannot create symbolic link / Klient nie ma wymaganych uprawnień":**
System Windows domyślnie zabrania zwykłym programom tworzenia tzw. "linków symbolicznych" (skrótów-widm) z powodów bezpieczeństwa. Pakiet tworzący aplikację `.exe` ich niestety wymaga. 
* **Rozwiązanie 1:** (Najszybsze) Uruchom aplikację Wiersz Polecenia (`cmd`) lub PowerShell jako **Administrator** (Prawy klik na ikonę w Menu Start -> Uruchom jako administrator). Następnie za pomocą komendy `cd` przejdź do folderu z aplikacją (np. `cd C:\Sciezka\Do\Folderu`) i wpisz obok komendę `npm run build:desktop`.
* **Rozwiązanie 2:** Włącz "Tryb dewelopera" w systemie Windows. Wpisz w lupkę na pasku zadań (lub w Menu Start) "Ustawienia trybu dewelopera" (Developer settings) i aktywuj przełącznik "Tryb dewelopera". Od teraz komenda będzie działać w każdym zwykłym okienku.

## Aplikacja komputerowa (.exe)
Jeśli chcesz stworzyć z tego prawdziwy, "klikalny" program na Windows (.exe) - przygotowałem automatyczny skrypt.
Gdy okno Twojego Wiersza Polecenia / Terminala jest otwarte (i nic w nim nie działa w danym momencie) wpisz po prostu:
```bash
npm run build:desktop
```
Po 1-2 minutach program wygeneruje nowiuteńką aplikację jako instalator (lub plik wykonywalny ze wszystkim wbudowanym w środek). Na płycie głównego folderu pojawi się nowy folder o nazwie `release`, a w nim klikalny plik – `TranslatePDF Setup.exe`! Wyślij go znajomym! 

## Sponsor
Jeśli ta aplikacja Ci się przydaje, możesz postawić twórcy wirtualną kawę korzystając z przycisku "Sponsor" na górze profilu! ☕
