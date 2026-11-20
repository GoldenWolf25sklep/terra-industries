# Terra Industries — mobilna gra 3D

Oryginalna gra 3D o eksploracji i automatyzacji przemysłowej, tworzona wyłącznie z myślą o telefonach. Docelowe platformy: Android i iOS. Nie planujemy wersji PC.

## Aktualne funkcje
- scena 3D z terenem i oświetleniem;
- postać gracza i kamera trzecioosobowa;
- sterowanie dotykowe: ekranowe przyciski ruchu i przeciąganie ekranu do obracania kamery;
- pole rudy żelaza;
- interakcja: podejdź do złoża i naciśnij E, aby zebrać jednostkę rudy;
- automatyczny zapis lokalny: ilość żelaza, pozycja gracza i stan złóż są zachowywane między uruchomieniami.

## Uruchomienie
Wymaga Node.js 20+:
```bash
npm install
npm run dev
```

## Plan rozwoju
1. rozbudowany ekwipunek i zasoby;
2. budowanie na siatce;
3. automatyczna koparka;
4. taśmociąg;
5. piec i sztabki żelaza;
6. energia, zapisy i optymalizacja mobilna.

To wczesny prototyp techniczny, a nie ukończona gra.
\n## Założenia mobilne\n- brak planowanej wersji komputerowej;\n- sterowanie dotykowe i obsługa bez klawiatury;\n- układ interfejsu uwzględnia bezpieczne obszary ekranu;\n- skalowanie renderowania na telefonach dla lepszej płynności i oszczędzania baterii;\n- Android APK budowany automatycznie przez GitHub Actions.\n