import WebFormWizard from './WebFormWizard';
import MobileFormWizard from './MobileFormWizard';
import AccessDenied from './AccessDenied';
import Loading from './Loading';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useValidateToken } from './hooks/useValidateToken';

const Profile = () => {
  const { isMobile } = useMobileDetection();
  const { isValidating, isValid, error, data } = useValidateToken();
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
