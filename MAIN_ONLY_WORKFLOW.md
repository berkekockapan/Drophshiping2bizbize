# Main Only Workflow

Bu projede gelistirme akisi sadece `main` dali uzerinden yurur.

## Temel Kural

- Yeni branch acma.
- `main` disinda commit yapma.
- Tum degisiklikleri dogrudan `main` uzerinde yap, commit et, push et.

## Her Oturum Baslangic Kontrolu

```bash
git checkout main
git fetch origin
git reset --hard origin/main
git clean -fd
git branch --show-current
```

Beklenen cikti: `main`

## Gunluk Kullanim Sirasi

1. `main` dalini guncelle
2. Degisiklikleri yap
3. Testleri calistir
4. `main` uzerinde commit at
5. `origin/main`e push et

## Hizli Komutlar

Durum:

```bash
git status -sb
git branch --show-current
```

Push:

```bash
git push origin main
```

## Yanlislikla Baska Dala Gecildiyse

```bash
git checkout main
git pull
```

Gerekirse local branch'i sil:

```bash
git branch -D <branch-adi>
```

