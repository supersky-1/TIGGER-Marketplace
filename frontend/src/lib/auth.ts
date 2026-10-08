export interface User {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
}

export const getUser = (): User | null => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getToken = (): string | null => {
  return localStorage.getItem("token");
};

export const isLoggedIn = (): boolean => {
  return !!getToken();
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};