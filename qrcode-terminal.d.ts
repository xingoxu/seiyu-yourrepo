declare module "qrcode-terminal" {
  export function generate(text: string, option?: { small?: boolean }): void;
}