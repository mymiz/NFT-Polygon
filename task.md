# Лабораторная: своя NFT на Polygon

**Стек:** TypeScript · Hardhat 3 · ethers.js v6 · OpenZeppelin · IPFS (Pinata)
**Сеть:** Polygon PoS **mainnet** (chainId `137`) — настоящий блокчейн, не тестнет
**Время:** ~4–6 часов
**Стоимость для вас:** 0 ₽. POL на газ выдаёт преподаватель, IPFS на бесплатном тарифе Pinata.

---

## Что вы сделаете

1. Поднимете проект на Hardhat 3 с TypeScript и ethers.
2. Напишете ERC-721 контракт и покроете его тестами.
3. Загрузите картинку и метадату в IPFS **из своего TS-скрипта**, а не через веб-интерфейс.
4. Задеплоите контракт в Polygon mainnet.
5. Сминтите себе NFT, у которой `tokenURI` указывает на вашу метадату в IPFS.

В итоге у вас будет настоящая NFT в основной сети Polygon. Её увидит любой человек по адресу контракта, она подтянется в кошельки и на маркетплейсы вроде OpenSea.

> ⚠️ Это mainnet: каждая транзакция стоит настоящих денег и **отменить её нельзя**. POL на газ ограничены. Поэтому всё, включая деплой и минт, сначала прогоняем **локально** в Hardhat и только потом отправляем в сеть.

---

## Что сдать

Ссылку на публичный GitHub-репозиторий, в README которого есть:

- [ ] адрес контракта и ссылка на него в [polygonscan.com](https://polygonscan.com)
- [ ] хэш транзакции минта
- [ ] `tokenId` вашей NFT
- [ ] `tokenURI` (вида `ipfs://...`) и рабочая ссылка на метадату через гейтвей (`https://ipfs.io/ipfs/<CID>`)
- [ ] скриншот вывода `npx hardhat test` (все тесты зелёные)
- [ ] ответы на контрольные вопросы в конце задания

> ⚠️ В репозитории **не должно быть** приватного ключа, `.env` или JWT от Pinata. Если секрет попал в историю git, его нужно перевыпустить: ключ Pinata отозвать, кошелёк считать скомпрометированным. Удаление файла новым коммитом секрет из истории не убирает.

---

## Шаг 0. Подготовка

**Софт:**
- Node.js **22.18+ или 24 LTS** (`node -v`). Hardhat 3 на старых версиях не работает.
- Git, VS Code (полезно расширение Solidity от Nomic Foundation).

**Кошелёк:**
- MetaMask или Rabby. **Создайте отдельный новый аккаунт только для этой работы.** Не используйте свой основной кошелёк: приватный ключ учебного будет лежать на вашем компьютере, и держать на нём стоит только выданные POL.
- Сеть Polygon обычно уже есть в кошельке. Если нет, подключите её одной кнопкой на [chainlist.org](https://chainlist.org/chain/137) или вручную:

| Параметр | Значение |
|---|---|
| Network name | Polygon |
| RPC URL | `https://polygon-bor-rpc.publicnode.com` |
| Chain ID | `137` |
| Currency | `POL` |
| Explorer | `https://polygonscan.com` |

**POL на газ:** пришлите преподавателю адрес учебного кошелька (`0x...`), он скинет POL. Деплой и минт вместе обычно стоят несколько десятых POL (зависит от цены газа в моменте). Выданные POL тратятся только на эту работу, на сторонние переводы и эксперименты в mainnet их не тратим.

**Pinata (IPFS):**
- Зарегистрируйтесь на [pinata.cloud](https://pinata.cloud). Бесплатный тариф без карты, лимита (1 ГБ, сотни файлов) хватит с запасом.
- В разделе **API Keys** создайте ключ и скопируйте **JWT**. Он показывается один раз.

---

## Шаг 1. Проект на Hardhat 3

```bash
mkdir my-nft && cd my-nft
npx hardhat --init
```

В мастере выберите **Hardhat 3** и шаблон **«A TypeScript Hardhat project using Mocha and Ethers.js»**, зависимости установите.

Потом поставьте OpenZeppelin и SDK Pinata:

```bash
npm i @openzeppelin/contracts pinata
```

**Разберитесь, что сгенерировалось**, это потом спросят на защите:
- `hardhat.config.ts`: что такое `plugins`, `networks`, `configVariable(...)`
- `contracts/`, `test/`, `ignition/modules/`, `scripts/`
- запустите `npx hardhat test` на шаблонном `Counter` и убедитесь, что всё зелёное
- удалите `Counter` (контракт, тесты, модуль Ignition), он больше не нужен

> В Hardhat 3 проект на ESM (`"type": "module"`), а сеть подключают явно: `const { ethers } = await network.create()`. Если гуглите примеры, проверьте, что они под Hardhat 3, а не под Hardhat 2: там `require`, `hre.ethers` и `hardhat-toolbox`.

---

## Шаг 2. Контракт

Создайте `contracts/StudentNFT.sol`.

**Требования:**
- наследуется от `ERC721URIStorage` из `@openzeppelin/contracts` (v5)
- имя и символ коллекции передаются в конструктор
- функция `mint(string uri)`:
  - минтит новый токен **тому, кто вызвал** (`msg.sender`)
  - `tokenId` идут по порядку: 0, 1, 2, …
  - сохраняет `uri` как `tokenURI` токена
  - эмитит своё событие `Minted(address to, uint256 tokenId, string tokenURI)`
- view-функция `totalMinted()` возвращает, сколько токенов сминчено

Компиляция: `npx hardhat build`

<details>
<summary>Подсказка (открывайте, только если застряли)</summary>

Смотрите `_safeMint` и `_setTokenURI` в OpenZeppelin, счётчик держите в `uint256 private _nextTokenId`.
Документация: https://docs.openzeppelin.com/contracts/5.x/erc721
</details>

---

## Шаг 3. Тесты

В `test/StudentNFT.ts` напишите **минимум 3 теста** на Mocha + Chai:

1. после `mint` владелец токена совпадает с вызвавшим, а `tokenURI` с переданным значением;
2. `mint` эмитит `Minted` с правильными аргументами (`.to.emit(...).withArgs(...)`);
3. `tokenId` растут, минтить могут разные адреса (`nft.connect(other).mint(...)`);
4. *(со звёздочкой)* `tokenURI` несуществующего токена ревертится с кастомной ошибкой `ERC721NonexistentToken`.

Шаблон начала файла:

```ts
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("StudentNFT", function () {
  it("...", async function () {
    const nft = await ethers.deployContract("StudentNFT", ["My Collection", "MYC"]);
    // ...
  });
});
```

`npx hardhat test` должен быть полностью зелёным.

---

## Шаг 4. IPFS: картинка и метадата

### Теория (прочитать до кода)

- В блокчейне хранить картинки дорого, поэтому контракт хранит только **ссылку** (`tokenURI`) на JSON с описанием токена.
- В IPFS файл адресуется **по содержимому**: его адрес это хэш, **CID**. Измените хоть один байт, и получится другой CID. Поэтому `ipfs://<CID>` нельзя тихо подменить, в отличие от `https://my-server.com/1.json`.
- IPFS сам по себе не хранит файлы вечно. Файл доступен, пока его кто-то **пинит** (держит у себя). Pinata как раз пиннинг-сервис.
- `ipfs://...` это «правильная» ссылка, её и кладём в контракт. `https://ipfs.io/ipfs/...` это **гейтвей**, способ открыть файл в обычном браузере.

### Формат метадаты

Стандарт ERC-721 Metadata плюс `attributes` (так их понимают маркетплейсы и кошельки):

```json
{
  "name": "My First NFT",
  "description": "Сминчено на Polygon в рамках курса",
  "image": "ipfs://<CID картинки>",
  "attributes": [
    { "trait_type": "Course", "value": "Blockchain 101" },
    { "trait_type": "Student", "value": "Иван Иванов" }
  ]
}
```

### Задание

1. Положите свою картинку в `assets/` (PNG/JPG, до 1–2 МБ). Нарисуйте, сгенерируйте, сфотографируйте, что угодно, но своё.
2. Создайте `.env` (и **сразу** проверьте, что он есть в `.gitignore`):
   ```
   PINATA_JWT=eyJhbGciOi...
   ```
3. Напишите `scripts/upload-to-ipfs.ts`, который:
   - читает картинку с диска и загружает её в IPFS через SDK `pinata` → получает CID картинки;
   - собирает объект метадаты с `image: "ipfs://<CID картинки>"`;
   - загружает метадату как JSON → получает CID метадаты;
   - печатает итоговый `tokenURI = ipfs://<CID метадаты>` и ссылку через гейтвей.
4. Запуск (Node сам выполняет TypeScript и читает `.env`, ничего доставлять не нужно):
   ```bash
   node --env-file=.env scripts/upload-to-ipfs.ts assets/my-nft.png
   ```
5. Откройте `https://ipfs.io/ipfs/<CID метадаты>` в браузере и убедитесь, что JSON открывается и картинка по ссылке из него тоже.

<details>
<summary>Подсказка по SDK Pinata</summary>

```ts
import { PinataSDK } from "pinata";
const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT });

const file = new File([bytes], "my-nft.png", { type: "image/png" });
const { cid } = await pinata.upload.public.file(file);
const { cid: metaCid } = await pinata.upload.public.json(metadata);
```

Документация: https://docs.pinata.cloud/sdk
Важно: `upload.public`, а не `upload.private`, иначе файлы не будут доступны через публичные гейтвеи.
</details>

---

## Шаг 5. Деплой в Polygon mainnet

1. Добавьте сеть в `hardhat.config.ts`:
   ```ts
   networks: {
     polygon: {
       type: "http",
       chainType: "l1",
       chainId: 137,
       url: configVariable("POLYGON_RPC_URL"),
       accounts: [configVariable("POLYGON_PRIVATE_KEY")],
     },
   },
   ```
2. Сохраните секреты в **зашифрованный keystore** Hardhat, а не в код и не в `.env`:
   ```bash
   npx hardhat keystore set POLYGON_RPC_URL       # https://polygon-bor-rpc.publicnode.com
   npx hardhat keystore set POLYGON_PRIVATE_KEY   # приватник УЧЕБНОГО кошелька, с 0x
   ```
   Приватный ключ: MetaMask → аккаунт → «Детали аккаунта» → «Показать закрытый ключ».
   Публичный RPC может тормозить или отдавать `429 Too Many Requests`. Тогда возьмите бесплатный RPC-эндпоинт у Alchemy, QuickNode или dRPC (регистрация без карты) и перезапишите `POLYGON_RPC_URL`.
3. Напишите модуль Ignition `ignition/modules/StudentNFT.ts`, который деплоит контракт с вашими именем и символом.
4. **Сначала локально** (без `--network`, это бесплатно):
   ```bash
   npx hardhat ignition deploy ignition/modules/StudentNFT.ts
   ```
   Всё прошло? Тогда в mainnet:
   ```bash
   npx hardhat ignition deploy ignition/modules/StudentNFT.ts --network polygon
   ```
   Ignition покажет сеть и попросит подтверждение. Проверьте, что там Polygon (chainId 137), и только потом жмите `y`.
5. Найдите адрес контракта в выводе (он также сохранится в `ignition/deployments/chain-137/deployed_addresses.json`) и откройте его на polygonscan.com.

> Не деплойте «на всякий случай» по несколько раз: каждый деплой съедает бо́льшую часть выданного газа. Если что-то пошло не так, сначала разберитесь локально.

---

## Шаг 6. Минт

Напишите `scripts/mint.ts`, который:
- подключается к сети через `network.create()`;
- получает контракт по адресу (`ethers.getContractAt("StudentNFT", address)`);
- вызывает `mint(tokenURI)` с вашим `ipfs://...` из шага 4;
- ждёт подтверждения (`tx.wait()`), достаёт `tokenId` из события `Minted` в логах транзакции;
- печатает хэш транзакции, `tokenId`, `ownerOf(tokenId)` и `tokenURI(tokenId)`, прочитанные **из блокчейна**.

Запуск: сначала локально против `npx hardhat node` (в соседнем терминале, `--network localhost`), потом в mainnet:
```bash
npx hardhat run scripts/mint.ts --network polygon
```

**Проверка результата:**
- транзакция видна на polygonscan.com, во вкладке *Logs* есть ваше событие `Minted`, в *Token Transfers* перевод ERC-721;
- `tokenURI` из контракта открывается через гейтвей и ведёт на вашу картинку;
- найдите свою NFT на [OpenSea](https://opensea.io) по адресу контракта: картинка, название и атрибуты должны подтянуться из IPFS (иногда с задержкой в несколько минут; если не обновилось, нажмите «Refresh metadata»);
- *(по желанию)* импортируйте NFT в MetaMask: вкладка NFT → «Импортировать NFT» → адрес контракта + `tokenId`.

---

## Бонусы (+ к оценке)

| | Задание | Баллы |
|---|---|---|
| ⭐ | **Верификация контракта.** Исходник должен быть виден на эксплорере: `npx hardhat verify` или `npx hardhat ignition verify <deploymentId>`. Посмотрите, какие эксплореры поддерживаются (Etherscan, Blockscout, Sourcify) и что нужно каждому | +1 |
| ⭐ | **Свой IPFS-узел.** Поставьте [IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/), добавьте туда ту же картинку и сравните CID с полученным от Pinata. Совпал? Если нет, разберитесь почему (подсказка: CIDv0 и CIDv1, `--cid-version`, raw leaves) | +1 |
| ⭐⭐ | **Ограничения в контракте.** `maxSupply`, цена минта в POL (`payable`), функция `withdraw` только для владельца (`Ownable`). Плюс тесты на всё это, включая реверты | +2 |
| ⭐⭐ | **Мини-фронт.** Страница с кнопкой «Connect wallet» и «Mint» на ethers v6 (`BrowserProvider`). Загрузку в IPFS делайте на бэке или заранее, **JWT не должен попасть в браузер** | +2 |
| ⭐⭐⭐ | **Общая коллекция группы.** Преподаватель деплоит один контракт, каждый минтит туда свою NFT своим скриптом. Ваш скрипт должен находить все токены коллекции через `queryFilter` по событию `Transfer` и выводить таблицу «владелец, tokenId, name из метадаты» | +3 |

---

## Критерии оценки (10 баллов)

| Что | Баллы |
|---|---|
| Проект на Hardhat 3 + TS собирается, структура понятная | 1 |
| Контракт соответствует требованиям | 2 |
| Тесты (≥3, все зелёные, есть проверка события) | 2 |
| Загрузка в IPFS собственным скриптом, метадата валидна и открывается | 2 |
| Контракт задеплоен в Polygon mainnet, NFT сминчена, `tokenURI` ведёт на IPFS | 2 |
| Секреты не в репо, README оформлен, ответы на вопросы | 1 |

---

## Частые ошибки

| Симптом | Причина |
|---|---|
| `insufficient funds for gas` | На адресе, чей приватник лежит в keystore, нет POL: преподаватель скинул на другой адрес, или газ ушёл на лишние деплои. Сверьте адрес |
| `429 Too Many Requests` / таймауты RPC | Публичный RPC перегружен. Возьмите свой бесплатный эндпоинт (Alchemy / QuickNode / dRPC) |
| `Cannot use import statement outside a module` / `require is not defined` | Пример из гайда под Hardhat 2. В Hardhat 3 только ESM и `network.create()` |
| Пример гайда использует `hre.ethers` или `@nomicfoundation/hardhat-toolbox` | То же самое: это Hardhat 2 |
| Гейтвей отдаёт 404 / долго грузит | Загрузили через `upload.private`, либо IPFS ещё «разогревается». Подождите минуту или попробуйте `https://<ваш-gateway>.mypinata.cloud/ipfs/<CID>` |
| В метадате `image: "https://..."` | Работает, но смысл IPFS теряется. Кладите `ipfs://<CID>` |
| Транзакция висит | Скачок цены газа в сети. Не перезапускайте скрипт, иначе можно сминтить дважды: подождите и проверьте адрес на polygonscan |
| На OpenSea нет картинки | Метадата ещё не подтянулась, нажмите «Refresh metadata». Проверьте, что JSON и картинка открываются через гейтвей |
| `ERC721NonexistentToken` | Обращаетесь к `tokenId`, которого ещё нет (они начинаются с 0) |

---

## Контрольные вопросы (ответить в README)

1. Почему в контракте хранится ссылка на метадату, а не сама картинка? Посчитайте примерно, сколько газа ушло бы на 1 МБ в storage.
2. Чем `ipfs://<CID>` лучше `https://myserver.com/1.json` как `tokenURI`? А чем хуже, что произойдёт, если файл никто не пинит?
3. Что такое CID и почему одна и та же картинка может получить разные CID?
4. Зачем `_safeMint`, а не `_mint`? Что произойдёт при минте на адрес контракта, который не умеет принимать ERC-721?
5. Сколько газа ушло на деплой и на минт (смотрите на polygonscan)? Почему деплой настолько дороже?
6. Где в вашем проекте хранится приватный ключ и почему не в `.env` в репозитории?
7. Что делает Hardhat Ignition и почему повторный `ignition deploy` не задеплоит контракт второй раз?

---

## Полезные ссылки

- Hardhat 3: https://hardhat.org/docs
- ethers v6: https://docs.ethers.org/v6/
- OpenZeppelin ERC-721: https://docs.openzeppelin.com/contracts/5.x/erc721
- EIP-721: https://eips.ethereum.org/EIPS/eip-721
- Pinata SDK: https://docs.pinata.cloud/sdk
- IPFS: что такое CID: https://docs.ipfs.tech/concepts/content-addressing/
- Polygon explorer: https://polygonscan.com

---

## Вопросы для защиты

- Разберитесь, что сгенерировалось, это потом спросят на защите:

- hardhat.config.ts: что такое plugins, networks, configVariable(...)
- contracts/, test/, ignition/modules/, scripts/
- запустите npx hardhat test на шаблонном Counter и убедитесь, что всё зелёное
- удалите Counter (контракт, тесты, модуль Ignition), он больше не нужен
- В Hardhat 3 проект на ESM ("type": "module"), а сеть подключают явно: const { ethers } = await network.create().