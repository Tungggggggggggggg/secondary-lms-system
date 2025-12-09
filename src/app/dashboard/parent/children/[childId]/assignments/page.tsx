export default function Page({ params }: { params: { childId: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">BÃ i táº­p cá»§a há»c sinh {params.childId}</h1>
      <p className="text-gray-500 mt-2">Trang Ä‘ang Ä‘Æ°á»£c phÃ¡t triá»ƒn.</p>
    </div>
  );
}



