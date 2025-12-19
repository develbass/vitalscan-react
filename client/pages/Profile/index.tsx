import WebFormWizard from './WebFormWizard';
import MobileFormWizard from './MobileFormWizard';
import AccessDenied from './AccessDenied';
import Loading from './Loading';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useValidateToken } from './hooks/useValidateToken';

const Profile = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile/index.tsx:9',message:'Profile component render started',data:{timestamp:Date.now(),url:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const { isMobile } = useMobileDetection();
  const { isValidating, isValid, error, data } = useValidateToken();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/ef05f324-2bd2-4798-b012-3d6b048b54c0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile/index.tsx:12',message:'useValidateToken result',data:{isValidating,isValid,hasError:!!error,dataIsNull:data===null,dataValue:data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  console.log('data', data);

  // Executa validação ao montar o componente
  // Os parâmetros token, beneficiaryUuid e clientUuid vêm da URL

  // Se houver erro na validação, pode mostrar uma mensagem ou redirecionar
  if (error) {
    console.error('Erro na validação do token:', error);
  }

  // Se ainda está validando, mostra o loading
  if (isValidating) {
    return <Loading />;
  }

  // Se a validação foi concluída e allowBeneficiaryScan é false, mostra mensagem de acesso negado
  // Verifica se há dados de validação e se allowBeneficiaryScan é explicitamente false
  if (data !== null && data.allowBeneficiaryScan === false) {
    return <AccessDenied />;
  }

  // Se isValid é false (erro na validação), também mostra acesso negado
  if (isValid === false) {
    return <AccessDenied />;
  }

  if (data === null) {
    //return <AccessDenied />;
  }

  // Se isValid é true ou null (não há parâmetros na URL ou validação bem-sucedida), mostra o formulário normalmente
  return <WebFormWizard />;
};

export default Profile;
