export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  QR: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  BusinessDetail: {
    slug: string;
  };
};
