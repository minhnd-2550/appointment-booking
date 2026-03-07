import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DoctorProfilePage } from "@/components/booking/DoctorProfilePage";

interface Props {
  params: Promise<{ id: string }>;
}

type DoctorProfileApiResponse = {
  doctor: {
    id: string;
    name: string;
    specialty: string;
    bio: string | null;
    avatar_url: string | null;
    is_active: boolean;
  };
  profile: {
    biography: string | null;
    qualifications: string | null;
    languages: string[];
    fee_override: number | null;
    photo_url: string | null;
  } | null;
  ratings: {
    avg: number | null;
    count: number;
    distribution: Record<string, number>;
    topReviews: {
      rating: number;
      comment: string | null;
      createdAt: string;
      reviewerName: string;
    }[];
  };
  nextAvailableDate: string | null;
};

async function getDoctorProfile(
  id: string,
): Promise<DoctorProfileApiResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/doctors/${id}/profile`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<DoctorProfileApiResponse>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getDoctorProfile(id);
  if (!data) return { title: "Bác sĩ không tìm thấy" };
  return {
    title: `${data.doctor.name} – ${data.doctor.specialty}`,
    description: data.profile?.biography ?? data.doctor.bio ?? undefined,
    openGraph: {
      title: `${data.doctor.name} – ${data.doctor.specialty}`,
      description: data.profile?.biography ?? data.doctor.bio ?? undefined,
      images:
        (data.profile?.photo_url ?? data.doctor.avatar_url)
          ? [{ url: data.profile?.photo_url ?? data.doctor.avatar_url! }]
          : [],
    },
  };
}

export default async function DoctorPublicProfilePage({ params }: Props) {
  const { id } = await params;
  const data = await getDoctorProfile(id);
  if (!data || !data.doctor.is_active) notFound();

  return (
    <DoctorProfilePage
      doctor={data.doctor}
      profile={data.profile}
      ratings={data.ratings}
      nextAvailableDate={data.nextAvailableDate}
    />
  );
}
