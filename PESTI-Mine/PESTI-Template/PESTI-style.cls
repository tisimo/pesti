%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% PESTI Report Class File 
%
% Adapted to PESTI/ISEP style (April/2024) by 
%  Elsa Ferreira Gomes (efg@isep.ipp.pt) and 
%  Jorge Coelho (jmn@isep.ipp.pt)
% Style updates:
%  - March/2025: António Barros (amb@isep.ipp.pt)
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% TMDEI Thesis Class File
% 
% Based on MastersDoctoralThesis Version 1.2 by Vel (vel@latextemplates.com) and
% Johannes Böttcher, downloaded from (21/11/15):
% http://www.LaTeXTemplates.com
%
% Authors:
%  Vel (vel@latextemplates.com)
%  Johannes Böttcher
%
% Adapted to TMDEI/ISEP style (Dec/2015) by 
%  Nuno Pereira (nap@isep.ipp.pt) and 
%  Paulo Baltarejo (pbs@isep.ipp.pt)
%
% Notes:
% 1) This class file defines the structure and layout of the template file (main.tex).
% 2) It has been written in such a way that under most circumstances you 
% should not need to edit it.
%
% Class license:
% LPPL v1.3c (http://www.latex-project.org/lppl)
%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

%----------------------------------------------------------------------------------------
%	CLASS DEFINITION AND PARAMETERS
%----------------------------------------------------------------------------------------

\NeedsTeXFormat{LaTeX2e}[1996/12/01]
\newcommand{\classname}{PESTI-style}
\ProvidesClass{\classname}
\providecommand{\baseclass}{book}

\RequirePackage{etoolbox}
\RequirePackage{xparse}
\newbool{nolistspace}
\newbool{listtoc}
\newbool{toctoc}
\newbool{parskip}
\newbool{hyperrefsupport}
\booltrue{hyperrefsupport}
\newbool{hyperreflinkcolor}
\booltrue{hyperreflinkcolor}
\newbool{headsepline}

\DeclareOption{nohyperref}{\boolfalse{hyperrefsupport}}
\DeclareOption{nohyperreflinkcolor}{\boolfalse{hyperreflinkcolor}}
\DeclareOption{nolistspacing}{\booltrue{nolistspace}}
\DeclareOption{liststotoc}{\booltrue{listtoc}}
\DeclareOption{toctotoc}{\booltrue{toctoc}}
\DeclareOption{parskip}{\booltrue{parskip}}
\DeclareOption{headsepline}{\booltrue{headsepline}}
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{\baseclass}}

\ProcessOptions\relax

\LoadClass{\baseclass}

%----------------------------------------------------------------------------------------
%	CLASS OPTIONS
%----------------------------------------------------------------------------------------
\ifbool{parskip}{\RequirePackage{parskip}} % If the parskip option is passed to the class, require the parskip package 

\patchcmd{\@makechapterhead}{\vspace*{50\p@}}{\abovechapterspace}{}{}
\patchcmd{\@makeschapterhead}{\vspace*{50\p@}}{\abovechapterspace}{}{}
\newcommand{\abovechapterspace}{\vspace*{50pt}}

\ifbool{listtoc}{% If the liststotoc option has been passed to the class, add the lists to the table of contents
	\patchcmd{\listoftables}{\@starttoc{lot}}{%
		\addchaptertocentry{\listtablename}\@starttoc{lot}}{}{}%
	\patchcmd{\listoffigures}{\@starttoc{lof}}{%
		\addchaptertocentry{\listfigurename}\@starttoc{lof}}{}{}%
}

\ifbool{toctoc}{% If the toctotoc options has been passed to the class, add the table of contents to the table of contents
	\patchcmd{\tableofcontents}{\@starttoc{toc}}{%
		\addchaptertocentry{\contentsname}\@starttoc{toc}}{}{}%
}

\patchcmd{\tableofcontents}{\MakeUppercase}{\MakeMarkcase}{}{}
\patchcmd{\tableofcontents}{\MakeUppercase}{\MakeMarkcase}{}{}
\patchcmd{\listoffigures}{\MakeUppercase}{\MakeMarkcase}{}{}
\patchcmd{\listoffigures}{\MakeUppercase}{\MakeMarkcase}{}{}
\patchcmd{\listoftables}{\MakeUppercase}{\MakeMarkcase}{}{}
\patchcmd{\listoftables}{\MakeUppercase}{\MakeMarkcase}{}{}

% If the option `nolistspacing' is given, the spacing in the different lists is reduced to single spacing. This option is only useful, if the spacing of the document has been changed to onehalfspacing or doublespacing.
\ifbool{nolistspace}{
	\patchcmd{\listoffigures}{%
		\@starttoc{lof}}{%
			\begingroup%
			\singlespace\@starttoc{lof}\endgroup%
		}{}{}%
	\patchcmd{\listoftables}{%
		\@starttoc{lot}}{%
			\begingroup%
			\singlespace\@starttoc{lot}\endgroup%
		}{}{}%
	\patchcmd{\tableofcontents}{%
		\@starttoc{toc}}{%
			\begingroup%
			\singlespace\@starttoc{toc}\endgroup%
		}{}{}%
}{}

% Addchap provides unnumbered chapters with an entry in the table of contents as well as an updated header
\ProvideDocumentCommand{\addchap}{ s o m }{%
	\chapter*{#3}%
	\markboth{}{}%
	\IfBooleanTF{#1}{%
	}{%
		\IfNoValueTF{#2}{%
			\addchaptertocentry{#3}%
			\markboth{\MakeMarkcase{#3}}{\MakeMarkcase{#3}}%
		}{%
			\addchaptertocentry{#2}%
			\markboth{\MakeMarkcase{#2}}{\MakeMarkcase{#2}}%
		}%
	}%
}%

\ProvideDocumentCommand{\addsec}{ s o m }{%
	\section*{#3}%
	\markright{}%
	\IfBooleanTF{#1}{%
	}{%
		\IfNoValueTF{#2}{%
			\addcontentsline{toc}{section}{#3}%
			\markright{\MakeMarkcase{#3}}%%
		}{%
			\addcontentsline{toc}{section}{#2}%
			\markright{\MakeMarkcase{#2}}%
		}%
	}%
}%

%----------------------------------------------------------------------------------------
%	REQUIRED PACKAGES
%----------------------------------------------------------------------------------------

\RequirePackage{babel} % Required for automatically changing names of document elements to languages besides english

\RequirePackage{scrbase} % Required for handling language-dependent names of sections/document elements

\RequirePackage{scrhack} % Loads fixes for various packages

\RequirePackage{setspace} % Required for changing line spacing

\RequirePackage{longtable} % Required for tables that span multiple pages (used in the symbols, abbreviations and physical constants pages)

\RequirePackage{siunitx} % Required for \SI commands

\RequirePackage{graphicx} % Required to include images
\graphicspath{{.}}

\RequirePackage[dvipsnames]{xcolor} % Required for extra color names

\RequirePackage{booktabs} % Required for better table rules

\RequirePackage{lmodern} % AMB: Latin Modern Roman for the text body (if needed serif font).
\RequirePackage[defaultsans,scale=0.90]{opensans} % AMB: Sans serif font similar to Calibri and Aptos, as required by the ISEP template guidelines.
\RequirePackage{inconsolata} % AMB Inconsolata mono space font for listings.

\renewcommand{\familydefault}{\sfdefault} % AMB: The text body uses a sans serif typeface, as specified by the ISEP template guidelines.

\RequirePackage[utf8]{inputenc} % Required for inputting portuguese characters
\RequirePackage[T1]{fontenc} % Output font encoding for portuguese characters

\RequirePackage[autostyle=true]{csquotes} % Required to generate language-dependent quotes in the bibliography

\RequirePackage[chapter]{algorithm} % Required for Algorithms
\RequirePackage{algpseudocode} % Part algorithmicx package, required to customize the layout of algorithms.

\RequirePackage{listings} % Required for code listings
\lstset{
  backgroundcolor=\color{white},     % choose the background color; 
  basicstyle=\ttfamily\footnotesize, % the size of the fonts that are used for the code
  breakatwhitespace=false,           % sets if automatic breaks should only happen at whitespace
  breaklines=true,                   % sets automatic line breaking
  captionpos=b,                      % sets the caption-position to bottom
  commentstyle=\color{OliveGreen},   % comment style
  deletekeywords={...},              % if you want to delete keywords from the given language
  escapeinside={\%*}{*)},            % if you want to add LaTeX within your code
  extendedchars=true,                % lets you use non-ASCII characters; for 8-bits encodings only, does not work with UTF-8
  frame=single,	                     % adds a frame around the code
  xleftmargin=1cm,                   % AMB: According to ISEP dissertation guidelines
  keepspaces=true,                   % keeps spaces in text, useful for keeping indentation of code 
  keywordstyle=\color{blue},         % keyword style
  language=C,                        % the default language of the code
  otherkeywords={*,...},             % if you want to add more keywords to the set
  numbers=left,                      % where to put the line-numbers; possible values are (none, left, right)
  numbersep=5pt,                     % how far the line-numbers are from the code
  numberstyle=\tiny\color{gray},     % the style that is used for the line-numbers
  rulecolor=\color{black},           % if not set, the frame-color may be changed on line-breaks within not-black text
  showspaces=false,                  % show spaces everywhere adding particular underscores; it overrides 'showstringspaces'
  showstringspaces=false,            % underline spaces within strings only
  showtabs=false,                    % show tabs within strings adding particular underscores
  stepnumber=1,                      % the step between two line-numbers. If it's 1, each line will be numbered
  stringstyle=\color{MidnightBlue},  % string literal style
  tabsize=2,	                     % sets default tabsize to 2 spaces
  title=\lstname,                    % show the filename of files included with \lstinputlisting; also try caption instead of title
  inputencoding = utf8,              % Input encoding
  literate=                          % Support additional characters
      {á}{{\'a}}1  {é}{{\'e}}1  {í}{{\'i}}1 {ó}{{\'o}}1  {ú}{{\'u}}1
      {Á}{{\'A}}1  {É}{{\'E}}1  {Í}{{\'I}}1 {Ó}{{\'O}}1  {Ú}{{\'U}}1
      {à}{{\`a}}1  {è}{{\`e}}1  {ì}{{\`i}}1 {ò}{{\`o}}1  {ù}{{\`u}}1
      {À}{{\`A}}1  {È}{{\'E}}1  {Ì}{{\`I}}1 {Ò}{{\`O}}1  {Ù}{{\`U}}1
      {ä}{{\"a}}1  {ë}{{\"e}}1  {ï}{{\"i}}1 {ö}{{\"o}}1  {ü}{{\"u}}1
      {Ä}{{\"A}}1  {Ë}{{\"E}}1  {Ï}{{\"I}}1 {Ö}{{\"O}}1  {Ü}{{\"U}}1
      {â}{{\^a}}1  {ê}{{\^e}}1  {î}{{\^i}}1 {ô}{{\^o}}1  {û}{{\^u}}1
      {Â}{{\^A}}1  {Ê}{{\^E}}1  {Î}{{\^I}}1 {Ô}{{\^O}}1  {Û}{{\^U}}1
      {œ}{{\oe}}1  {Œ}{{\OE}}1  {æ}{{\ae}}1 {Æ}{{\AE}}1  {ß}{{\ss}}1
      {ç}{{\c c}}1 {Ç}{{\c C}}1 {ø}{{\o}}1  {Ø}{{\O}}1   {å}{{\r a}}1
      {Å}{{\r A}}1 {ã}{{\~a}}1  {õ}{{\~o}}1 {Ã}{{\~A}}1  {Õ}{{\~O}}1
      {ñ}{{\~n}}1  {Ñ}{{\~N}}1  {¿}{{?`}}1  {¡}{{!`}}1
      {°}{{\textdegree}}1 {º}{{\textordmasculine}}1 {ª}{{\textordfeminine}}1
}

\RequirePackage[acronym,nonumberlist]{glossaries} % Required to define acronyms and make glossaries

\RequirePackage[centerlast,small,sc]{caption} % Required for customising the captions
\setlength{\captionmargin}{50pt}

%----------------------------------------------------------------------------------------

\newcommand{\checktoopen}{% New command to move content to the next page which prints to the next odd page if twosided mode is active  
\if@openright\cleardoublepage\else\clearpage\fi
}

\newcommand\bhrule{\typeout{--------------------}}
\newcommand\tttypeout[1]{\bhrule\typeout{\space #1}\bhrule}

\newcommand{\HRule}{\rule{\linewidth}{0.5mm}} % New command to make the lines in the title page
\newcommand{\decoRule}{\rule{.8\textwidth}{.4pt}} % New command for a rule to be used under figures

\renewcommand{\abovechapterspace}{\vspace*{10pt}} % Reduce the whitespace above a chapter heading

\setcounter{tocdepth}{3} % The depth to which the document sections are printed to the table of contents
\providecommand\addchaptertocentry[1]{%
\ifdef{\phantomsection}{\phantomsection}{}% The \phantomsection command is necessary for hyperref to jump to the correct page
\addcontentsline{toc}{chapter}{#1}%
}

%----------------------------------------------------------------------------------------
%	MARGINS
%----------------------------------------------------------------------------------------

\RequirePackage{geometry}
\geometry{
	head=13.7pt,
	paper=a4paper, % Change to letterpaper for US letter
	inner=3.5cm, % Inner margin
	outer=2.6cm, % Outer margin
	%bindingoffset=2cm, % Binding offset
	top=3.5cm, % Top margin
	bottom=2.5cm, % Bottom margin	
}

\raggedbottom

%----------------------------------------------------------------------------------------
%	PENALTIES
%----------------------------------------------------------------------------------------

\doublehyphendemerits=10000 % No consecutive line hyphens
\brokenpenalty=10000 % No broken words across columns/pages
\widowpenalty=9999 % Almost no widows at bottom of page
\clubpenalty=9999 % Almost no orphans at top of page
\interfootnotelinepenalty=9999 % Almost never break footnotes

%----------------------------------------------------------------------------------------
%	HEADERS AND FOOTERS
%----------------------------------------------------------------------------------------

\RequirePackage[markcase=used]{scrlayer-scrpage}

\providepairofpagestyles{thesisSimple}{%
	\clearpairofpagestyles%
	\automark[chapter]{chapter}
	\ihead{\headmark}% Inner header
	\ohead[\pagemark]{\pagemark}% Outer header
}
\ifoot{}% Inner footer
\ofoot{}% Outer footer

\pagestyle{thesisSimple}

\providepairofpagestyles[thesisSimple]{thesis}{%
	\automark*[section]{}%
}

\pagestyle{thesis}
\ifbool{headsepline}{\KOMAoption{headsepline}{true}}{}
\PreventPackageFromLoading[\ClassError{\classname}{Package `fancyhdr' is
incompatible\MessageBreak with this class}{The pagesyles are defined 
using package `scrlayer-scrpage', please consult the\MessageBreak 
KOMA-script documentation for details.}]{fancyhdr}
% Remove the headsepline
\KOMAoptions{headsepline=false}

\newcommand{\blank@p@gestyle}{empty}
\newcommand{\blankpagestyle}[1]{\def\blank@p@gestyle{#1}}

\def\cleardoublepage{\clearpage\if@twoside \ifodd\c@page\else
\hbox{}
\thispagestyle{\blank@p@gestyle}
\newpage
\if@twocolumn\hbox{}\newpage\fi\fi\fi}

%----------------------------------------------------------------------------------------
%	DEFINE CUSTOM THESIS INFORMATION COMMANDS
%----------------------------------------------------------------------------------------

%\def\author{}
%\def\ttitle{}
\newcommand*{\supervisor}[1]{\def\supname{#1}}
\newcommand*{\externalsupervisor}[1]{\def\extsupname{#1}}
\newcommand*{\thesistitle}[1]{\def\@title{#1}\def\ttitle{#1}}
\newcommand*{\thesisinstitution}[1]{\def\tinstitution{#1}}
\newcommand*{\thesisacademicyear}[1]{\def\tacademicyear{#1}}
\newcommand*{\examdate}[1]{\def\texamdate{#1}}
\newcommand*{\studentname}[1]{\def\author{#1}}
\newcommand*{\studentnumber}[1]{\def\authornumber{#1}}
\newcommand*{\keywords}[1]{\def\keywordnames{#1}}

%----------------------------------------------------------------------------------------
%	TITLEPAGE PAGE DESIGN
%----------------------------------------------------------------------------------------

\newcommand{\dissertationdisclamer}{Project/Internship Report for the Bachelor's Degree in \\ Computer Engineering.}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\dissertationdisclamer}{Project/Internship Report for the Bachelor's Degree in \\ Computer Engineering.}
\providecaptionname{portuguese}{\dissertationdisclamer}{Relatório de Projeto/Estágio da Licenciatura em \\ Engenharia Inform\'atica.\\} % Portuguese

\newcommand{\supervisorlabel}{Supervisor}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\supervisorlabel}{Supervisor}
\providecaptionname{portuguese}{\supervisorlabel}{Orientador ISEP}

\newcommand{\externalsupervisorlabel}{External Supervisor}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\externalsupervisorlabel}{External Supervisor}
\providecaptionname{portuguese}{\externalsupervisorlabel}{Supervisor Externo}





\newcommand{\maketitlepage}{
	% CAPA / COVER ---------------------------------------------
	\checktoopen
	\newgeometry{top=3.5cm, bottom=3.0cm, left=3.0cm, right=3.0cm}
	\begin{titlepage}
		\begin{center}
			{\includegraphics[width=2.5in]{/frontmatter/assets/logo_dei.pdf}}
			\null
		
			\vfill
		
			{\huge \bfseries \ttitle} % Thesis title
					
			\ifdefined\tinstitution {\tinstitution} \fi % Internship host institution, if exists
		
			\vspace{15mm}
		
    		{\Large \tacademicyear}
		
			\vspace{20mm}
		
			{\bfseries \authornumber \quad \author}
		
			\vfill
			
			{\includegraphics[width=2.5in]{/frontmatter/assets/isep_logo.pdf}}
		\end{center}
	\end{titlepage}
	
	
	% PRIMEIRA PÁGINA / FIRST PAGE -----------------------------
	\begin{titlepage}
		\begin{center}
			\null
			\vfill
	
			{\huge \bfseries \ttitle} % Thesis title
			
			\ifdefined\tinstitution {\tinstitution} \fi % Thesis sub title, if exists
			\vspace{15mm}
    		
			{\Large \tacademicyear}
			\vspace{25mm}
			
			{\bfseries \authornumber \quad \author}
			\vfill

		    {\centering \includegraphics[width=2.5in]{/frontmatter/assets/logo_dei.pdf}}
			\vfill
			
    		{\Large \bfseries Licenciatura em Engenharia Informática}
    		\vfill
		
    		{\large \texamdate}
		    \vfill
		    
			{\supervisorlabel: \bfseries \supname}
		    \vspace{5mm}
		    
			\ifdefined\extsupname {\externalsupervisorlabel: \bfseries \extsupname} \fi
			\vfill
    	\end{center}
	\end{titlepage}

	\restoregeometry
}

%----------------------------------------------------------------------------------------
%	STATEMENT OF INTEGRITY
%----------------------------------------------------------------------------------------

\newcommand{\statementlabel}{Statement of Integrity}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\statementlabel}{Statement of Integrity}
\providecaptionname{portuguese}{\statementlabel}{Declara\c{c}\~ao de Integridade} % Portuguese

\newcommand{\statementtext}{I hereby declare having conducted this academic work with integrity.\\I have not plagiarised or applied any form of undue use of information or falsification of results along the process leading to its elaboration.\\Therefore the work presented in this document is original and authored by me, having not previously been used for any other end.\\I further declare that I have fully acknowledged the Code of Ethical Conduct of P.PORTO.\\ISEP, \tacademicyear}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\statementtext}{I hereby declare having conducted this academic work with integrity.\\\\I have not plagiarised or applied any form of undue use of information or falsification of results along the process leading to its elaboration.\\\\Therefore the work presented in this document is original and authored by me, having not previously been used for any other end.\\\\I further declare that I have fully acknowledged the Code of Ethical Conduct of P.PORTO.\\\\ISEP, \today}
\providecaptionname{portuguese}{\statementtext}{Declaro ter conduzido este trabalho acad\'emico com integridade.\\\\N\~{a}o plagiei ou apliquei qualquer forma de uso indevido de informa\c{c}\~{o}es ou falsifica\c{c}\~{a}o de resultados ao longo do processo que levou \`{a} sua elabora\c{c}\~{a}o.\\\\Portanto, o trabalho apresentado neste documento \'{e} original e de minha autoria, n\~{a}o tendo sido utilizado anteriormente para nenhum outro fim.\\\\Declaro ainda que tenho pleno conhecimento do C\'{o}digo de Conduta \'{E}tica do P.PORTO.\\\\ISEP, \today} % Portuguese

\newenvironment{integritystatement}{
	\checktoopen
	\tttypeout{\statementlabel}
	\thispagestyle{plain}
	\chapter*{\statementlabel}
	\statementtext
}
{
  \vfil\vfil\vfil\null
}


%----------------------------------------------------------------------------------------
%	DEDICATION PAGE DESIGN
%----------------------------------------------------------------------------------------

\newcommand{\dedicationlabel}{Dedicatory}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\dedicationlabel}{Dedicatory}
\providecaptionname{portuguese}{\dedicationlabel}{Dedicat\'oria} % Portuguese 

\newenvironment{dedicatory}{
	\checktoopen
	\tttypeout{\dedicationlabel}
	\thispagestyle{plain}
	\chapter*{\dedicationlabel}
}
{
  \vfil\vfil\vfil\null
}

%----------------------------------------------------------------------------------------
%	ABSTRACT PAGE DESIGN
%----------------------------------------------------------------------------------------

\newcommand{\abslabel}{Abstract}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\abslabel}{Abstract}
\providecaptionname{portuguese}{\abslabel}{Resumo} % Portuguese 

\newcommand{\keywordslabel}{Keywords}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\keywordslabel}{Keywords}
\providecaptionname{portuguese}{\keywordslabel}{Palavras-chave} % Portuguese 

\newenvironment{abstract}{
	\checktoopen
	\tttypeout{\abstractname}
	%\addchaptertocentry{\abstractname} % Add the abstract to the table of contents
	\thispagestyle{plain}
	\chapter*{\abslabel}	
}
{
  \vfil\vfil\vfil\null
}

\newcommand{\abslabelotherlang}{Resumo}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish}{\abslabelotherlang}{Resumo}
\providecaptionname{portuguese}{\abslabelotherlang}{Abstract}  

\newenvironment{abstractotherlanguage}{
	\checktoopen
	\tttypeout{\abslabel}
	%\addchaptertocentry{\abslabelotherlang} % Add the abstract to the table of contents	
	\thispagestyle{plain}
	\chapter*{\abslabelotherlang}
}
{
  \vfil\vfil\vfil\null
}

%----------------------------------------------------------------------------------------
%	ABBREVIATIONS PAGE DESIGN
%----------------------------------------------------------------------------------------

\newcommand{\abbrevname}{List of Abbreviations}
\providecaptionname{english,british,american}{\abbrevname}{List of Abbreviations}
\providecaptionname{portuguese}{\abbrevname}{Lista de Abrevia\c{c}\~oes}
\NewDocumentEnvironment{abbreviations}{ m }{%
	\ifbool{nolistspace}{\begingroup\singlespacing}{}
	\ifbool{listtoc}{\addchap{\abbrevname}}{\addchap*{\abbrevname}}
	\begin{longtable}{#1}
}{%
\end{longtable}
\addtocounter{table}{-1} % Don't count this table as one of the document tables
\ifbool{nolistspace}{\endgroup}{}
}

%----------------------------------------------------------------------------------------
%	PHYSICAL CONSTANTS PAGE DESIGN
%----------------------------------------------------------------------------------------

\newcommand{\constantsname}{Physical Constants}
\providecaptionname{english,british,american}{\constantsname}{Physical Constants}
\providecaptionname{portuguese}{\constantsname}{Constantes}

\NewDocumentEnvironment{constants}{ m }{%
	\ifbool{nolistspace}{\begingroup\singlespacing}{}
	\ifbool{listtoc}{\addchap{\constantsname}}{\addchap*{\constantsname}}
	\begin{longtable}{#1}
}{%
\end{longtable}
\addtocounter{table}{-1} % Don't count this table as one of the document tables
\ifbool{nolistspace}{\endgroup}{}
}

%----------------------------------------------------------------------------------------
%	SYMBOLS PAGE DESIGN
%----------------------------------------------------------------------------------------

\newcommand{\symbolsname}{Symbols}
\providecaptionname{english,british,american}{\symbolsname}{List of Symbols}
\providecaptionname{portuguese}{\symbolsname}{Lista de S\'imbolos}
\NewDocumentEnvironment{symbols}{ m }{%
	\ifbool{nolistspace}{\begingroup\singlespacing}{}
	\ifbool{listtoc}{\addchap{\symbolsname}}{\addchap*{\symbolsname}}
	\begin{longtable}{#1}
}{%
\end{longtable}
\addtocounter{table}{-1} % Don't count this table as one of the document tables
\ifbool{nolistspace}{\endgroup}{}
}

%----------------------------------------------------------------------------------------
%	ACKNOWLEDGEMENT PAGE DESIGN
%----------------------------------------------------------------------------------------

\newcommand{\acknowledgementlabel}{Acknowledgements}
\providecaptionname{american,australian,british,canadian,english,newzealand,UKenglish,USenglish} {\acknowledgementlabel}{Acknowledgements} % Acknowledgement text for English countries
\providecaptionname{portuguese} {\acknowledgementlabel}{Agradecimentos}
\newenvironment{acknowledgements}{
	%\addchaptertocentry{\acknowledgementlabel} % Add the acknowledgements to the table of contents
	\tttypeout{\acknowledgementlabel}
	\null\vfil
	\thispagestyle{plain}
	\chapter*{\acknowledgementlabel}
}
{
  \vfil\vfil\vfil\null
}

%----------------------------------------------------------------------------------------

\ifbool{hyperreflinkcolor}{\newcommand{\hreflinkcolor}{true}}{\newcommand{\hreflinkcolor}{false}}


\ifbool{hyperrefsupport}{% If the nohyperref class option has not been specified
\AfterPackage{biblatex}{ % Load the hyperref package after the biblatex package for compatibility 
\RequirePackage{hyperref} % Required for customising links and the PDF
\hypersetup{pdfpagemode={UseOutlines},
	bookmarksopen=true,
	bookmarksopenlevel=0,
	hypertexnames=false,
	colorlinks=\hreflinkcolor, % Set coloring of links
	citecolor=CadetBlue, % The color of citations
	linkcolor=NavyBlue, % The color of references to document elements (sections, figures, etc)
	urlcolor=CadetBlue, % The color of hyperlinks (URLs)
	pdfstartview={FitV},
	unicode,
	breaklinks=true,
	hidelinks,
}

\pdfstringdefDisableCommands{% If there is an explicit linebreak in a section heading (or anything printed to the pdf-bookmarks), it is replaced by a space
   \let\\\space%
}
}
}{%nothing
}

%----------------------------------------------------------------------------------------

% Define some commands to keep the formatting separated from the content 
\newcommand{\keyword}[1]{\textbf{#1}}
\newcommand{\tabhead}[1]{\textbf{#1}}
\newcommand{\code}[1]{\lstinline{#1}}
\newcommand{\file}[1]{\texttt{\bfseries#1}}
\newcommand{\option}[1]{\texttt{\itshape#1}}

%----------------------------------------------------------------------------------------

\endinput
