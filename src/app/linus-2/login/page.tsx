import LoginPage from "@/app/(auth)/login/page";

export default function Linus2LoginPage(props: Parameters<typeof LoginPage>[0]) {
  return <LoginPage {...props} redirectTo="/linus-2" />;
}
