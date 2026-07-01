# Hai Qua

Mini game React + HTML canvas. Player controls Lan Anh running around the orchard map, catching fruits that drop from trees.

## Gameplay

- Move around the map with arrow keys or `WASD`.
- Hold `Shift` to sprint.
- Press `Space` to jump across `rau_lang` rows.
- Stand under/near a tree to use the catching pose.
- Press `Q` near a tree to shake it and make fruit fall faster.
- Fruits drop from trees over time. Catch falling fruit by colliding with Lan Anh.
- Collect `30` fruits before the `420s` timer ends to win.

## Phase Config

| Phase | Trees | Fruits per tree | Drop interval | Fall time |
| --- | ---: | ---: | ---: | --- |
| 1 | 3 | 1 | 10s | 6-7s |
| 2 | 4 | 1 | 10s | 6-10s |
| 3 | 4 | 2 | 10s | 5-9s |
| 4 | 5 | 2 | 8s | 4-8s |
| 5 | 5 | 3 | 8s | 4-7s |
| 6 | 6 | 3 | 6s | 3-6s |
| 7 | 6 | 4 | 6s | 3-5s |

## Lan Anh Sprite Slicing

Run:

- Horizontal: 2
- Vertical: 2
- Size: 150 x 150 px
- Separation: 0 x 0 px
- Offset: 0 x 0 px

Walk right:

- Horizontal: 4
- Vertical: 1
- Size: 184 x 132 px
- Separation: 0 x 0 px
- Offset: 0 x 0 px

Walk down:

- Horizontal: 4
- Vertical: 1
- Size: 184 x 130 px
- Separation: 0 x 0 px
- Offset: 0 x 0 px

Walk up:

- Horizontal: 4
- Vertical: 1
- Size: 184 x 132 px
- Separation: 0 x 0 px
- Offset: 0 x 0 px

## Assets

- Trees load from `public/item/cay.png`.
- Fruits load from `public/item/xoai.png`, `public/item/oi.png`, and `public/item/man.png`.
- `rau_lang` rows load from `public/item/Screenshot_2026-07-01_220320-removebg-preview.png`.
- Target visual reference is `public/ouput.png`.
