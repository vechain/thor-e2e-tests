type Wallet = {
  privateKey: string;
  address: string;
  comment: string;
  balance?: string;
};

// from genesis.json
const wallets = {
  "account0": {
    privateKey: "",
    address: "0x7567d83b7b8d80addcb281a71d54fc7b3364ffed",
    balance: "0x14ADF4B7320334B9000000",
    comment: "Account with no energy",
  },
  "account1": {
    privateKey:
      "7b067f53d350f1cf20ec13df416b7b73e88a1dc7331bc904b92108b1e76a08b1",
    address: "0x435933c8064b4ae76be665428e0307ef2ccfbd68",
    comment: "TODO",
  },
  "account2": {
    privateKey:
      "f4a1a17039216f535d42ec23732c79943ffb45a089fbb78a14daad0dae93e991",
    address: "0x0f872421dc479f3c11edd89512731814d0598db5",
    comment: "TODO",
  },
  "account3": {
    privateKey:
      "35b5cc144faca7d7f220fca7ad3420090861d5231d80eb23e1013426847371c4",
    address: "0xf370940abdbd2583bc80bfc19d19bc216c88ccf0",
    comment: "TODO",
  },
  "account4": {
    privateKey:
      "10c851d8d6c6ed9e6f625742063f292f4cf57c2dbeea8099fa3aca53ef90aef1",
    address: "0x99602e4bbc0503b8ff4432bb1857f916c3653b85",
    comment: "TODO",
  },
  "account5": {
    privateKey:
      "2dd2c5b5d65913214783a6bd5679d8c6ef29ca9f2e2eae98b4add061d0b85ea0",
    address: "0x61e7d0c2b25706be3485980f39a3a994a8207acf",
    comment: "TODO",
  },
};

type WalletKey = keyof typeof wallets

export const wallet = (name: WalletKey): Wallet => { return wallets[name] }
