// O logo da loja é opcional: se existir assets/logo.png, ele aparece nos painéis.
import { existsSync } from "node:fs";

const CAMINHO_LOGO = "./assets/logo.png";
const temLogo = () => existsSync(CAMINHO_LOGO);

export { CAMINHO_LOGO, temLogo };
