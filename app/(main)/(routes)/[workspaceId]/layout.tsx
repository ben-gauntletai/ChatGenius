import { checkAndVectorizeMessages } from "@/lib/vector-store";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check for unvectorized messages and process them if needed
  try {
    await checkAndVectorizeMessages();
  } catch (error) {
    console.error("Error checking for unvectorized messages:", error);
    // Continue with the layout even if vectorization fails
  }

  return (
    <div className="h-full">
      {children}
    </div>
  );
} 