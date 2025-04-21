import { Flex } from '@chakra-ui/react';
import { Navbar } from '../nav/Navbar';
import { OpenGraph } from '../background/OpenGraph';

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
}

const MainLayout = ({ children, title }: MainLayoutProps) => {
    return (
        <>
            <OpenGraph title={title} />
            <Flex
                h='100vh'
                width='100%'
                direction='column'
                backgroundImage={'/images/rift_background_low.webp'}
                backgroundSize='cover'
                backgroundPosition='center'>
                <Navbar />
                {children}
            </Flex>
        </>
    );
};

export default MainLayout;
