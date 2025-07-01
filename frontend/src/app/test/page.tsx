// 프로젝트 지식의 page.tsx 기반
export default function AIPassportSystem() {
  // 모든 분리된 컴포넌트들을 import해서 조립
  return (
    <MainLayout>
      {!isAuthenticated ? (
        <RegistrationFlow />
      ) : (
        < >s
          <Sidebar>
            <PassportCard />
            <DataVaults />
            <CueBalance />
          </Sidebar>
          <Main>
            <ChatInterface />
          </Main>
        </>
      )}
    </MainLayout>
  )
}